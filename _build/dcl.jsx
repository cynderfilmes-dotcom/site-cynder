// Runtime leve que desenha as páginas do site da Cynder Filmes a partir do
// modelo <x-dc> (o mesmo formato usado no editor) usando React.
import React from 'react';
import { createRoot } from 'react-dom/client';

class DCLogic extends React.Component {
  constructor(props) {
    super(props);
    if (!this.state) this.state = {};
  }
}
window.DCLogic = DCLogic;
window.React = React;

const EVENTS = {
  onclick: 'onClick', oncanplay: 'onCanPlay', oninput: 'onChange', onchange: 'onChange',
  onmousedown: 'onMouseDown', onmouseleave: 'onMouseLeave', onmousemove: 'onMouseMove',
  onmouseup: 'onMouseUp', onmouseenter: 'onMouseEnter', onsubmit: 'onSubmit',
  ontouchend: 'onTouchEnd', ontouchmove: 'onTouchMove', ontouchstart: 'onTouchStart',
  onkeydown: 'onKeyDown', onfocus: 'onFocus', onblur: 'onBlur', onscroll: 'onScroll',
  onended: 'onEnded', onplay: 'onPlay', onpause: 'onPause', onloadeddata: 'onLoadedData',
  ontimeupdate: 'onTimeUpdate', onwheel: 'onWheel',
};
const ATTRS = {
  class: 'className', for: 'htmlFor', playsinline: 'playsInline', autoplay: 'autoPlay',
  tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', colspan: 'colSpan',
  rowspan: 'rowSpan', srcset: 'srcSet', crossorigin: 'crossOrigin', autocomplete: 'autoComplete',
  allowfullscreen: 'allowFullScreen', frameborder: 'frameBorder', enterkeyhint: 'enterKeyHint',
  inputmode: 'inputMode', 'xlink:href': 'xlinkHref',
};
const BOOL = new Set(['muted', 'loop', 'autoplay', 'controls', 'playsinline', 'disabled', 'checked',
  'required', 'readonly', 'hidden', 'allowfullscreen', 'selected', 'multiple', 'novalidate']);
const HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;

function lookup(path, scope) {
  if (path === 'true') return true;
  if (path === 'false') return false;
  if (path === 'null') return null;
  if (path === 'undefined') return undefined;
  if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
  if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
  const parts = path.split('.');
  let v;
  for (let i = scope.length - 1; i >= 0; i--) {
    if (scope[i] && Object.prototype.hasOwnProperty.call(scope[i], parts[0])) { v = scope[i][parts[0]]; break; }
  }
  for (let k = 1; k < parts.length && v != null; k++) v = v[parts[k]];
  return v;
}

function interp(str, scope) {
  const whole = str.match(/^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/);
  if (whole) return lookup(whole[1], scope);
  return str.replace(HOLE, (_, p) => { const v = lookup(p, scope); return v == null ? '' : String(v); });
}

function camelCss(p) {
  if (p.startsWith('--')) return p;
  return p.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function parseStyle(text) {
  const out = {};
  if (!text) return out;
  let depth = 0, cur = '';
  const decls = [];
  for (const ch of String(text)) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { decls.push(cur); cur = ''; } else cur += ch;
  }
  decls.push(cur);
  for (const d of decls) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    const k = d.slice(0, i).trim();
    const v = d.slice(i + 1).trim();
    if (k) out[camelCss(k)] = v;
  }
  return out;
}

// Converte o DOM do modelo em uma árvore simples, uma vez só.
function pre(node) {
  if (node.nodeType === 3) return { text: node.nodeValue };
  if (node.nodeType !== 1) return null;
  const tag = node.namespaceURI === 'http://www.w3.org/1999/xhtml' ? node.tagName.toLowerCase() : node.tagName;
  const attrs = [];
  for (const a of node.attributes) attrs.push([a.name, a.value]);
  const kids = [];
  const src = tag === 'template' ? node.content.childNodes : node.childNodes;
  for (const c of src) { const p = pre(c); if (p) kids.push(p); }
  return { tag, attrs, kids };
}

function build(n, scope, key) {
  if (n.text != null) {
    if (n.text.indexOf('{{') < 0) return n.text;
    const v = interp(n.text, scope);
    return v == null || v === false ? '' : (typeof v === 'object' ? '' : String(v));
  }
  const get = (name) => { const a = n.attrs.find((x) => x[0] === name); return a ? a[1] : undefined; };
  if (n.tag === 'sc-for') {
    const list = interp(get('list') || '', scope) || [];
    const as = get('as') || 'item';
    return React.createElement(React.Fragment, { key }, (Array.isArray(list) ? list : []).map((item, i) =>
      React.createElement(React.Fragment, { key: i }, n.kids.map((k, j) => build(k, scope.concat([{ [as]: item, $index: i }]), j)))));
  }
  if (n.tag === 'sc-if') {
    const v = interp(get('value') || '', scope);
    if (!v) return null;
    return React.createElement(React.Fragment, { key }, n.kids.map((k, j) => build(k, scope, j)));
  }
  const props = { key };
  for (const [raw, val] of n.attrs) {
    if (raw.startsWith('hint-')) continue;
    const lname = raw.toLowerCase();
    if (EVENTS[lname]) { const f = interp(val, scope); if (typeof f === 'function') props[EVENTS[lname]] = f; continue; }
    if (lname === 'style') { props.style = parseStyle(interp(val, scope)); continue; }
    if (BOOL.has(lname) && val.indexOf('{{') < 0) { props[ATTRS[lname] || lname] = true; continue; }
    let name = ATTRS[lname] || raw;
    if (!ATTRS[lname] && /-/.test(raw) && !/^(data|aria)-/.test(raw)) name = raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    let v = interp(val, scope);
    if (BOOL.has(lname)) v = !!v && v !== 'false';
    if (v === undefined) continue;
    if (name === 'ref' && typeof v !== 'function' && typeof v !== 'object') continue;
    props[name] = v;
  }
  if ((n.tag === 'input' || n.tag === 'textarea') && 'value' in props && !props.onChange) {
    props.defaultValue = props.value; delete props.value;
  }
  const kids = n.kids.map((k, j) => build(k, scope, j));
  if (n.tag === 'textarea') { return React.createElement('textarea', props); }
  return React.createElement(n.tag, props, ...(kids.length ? kids : []));
}

function boot() {
  const tpl = document.querySelector('template[data-dc]');
  const script = document.querySelector('script[data-dc-script]');
  if (!tpl || !script) return;
  const tree = [];
  for (const c of tpl.content.childNodes) { const p = pre(c); if (p) tree.push(p); }
  let defaults = {};
  try {
    const dp = JSON.parse(script.getAttribute('data-props') || '{}');
    for (const k of Object.keys(dp)) if (k[0] !== '$' && dp[k] && 'default' in dp[k]) defaults[k] = dp[k].default;
  } catch (e) {}
  const Logic = new Function('DCLogic', 'React', script.textContent + '\n;return Component;')(DCLogic, React);
  class Page extends Logic {
    render() {
      const vals = this.renderVals ? this.renderVals() : {};
      return React.createElement(React.Fragment, null, tree.map((n, i) => build(n, [vals], i)));
    }
  }
  const mount = document.createElement('div');
  mount.id = 'site';
  document.body.insertBefore(mount, document.body.firstChild);
  createRoot(mount).render(React.createElement(Page, defaults));
  if (location.hash) setTimeout(() => { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }, 400);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
