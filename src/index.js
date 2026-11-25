// Leva quem acessar cynderfilmes.com.br (sem www) para www.cynderfilmes.com.br
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'cynderfilmes.com.br') {
      url.hostname = 'www.cynderfilmes.com.br';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
