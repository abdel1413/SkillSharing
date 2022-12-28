const { match } = require("assert/strict");
const { parse } = require("url");
let url = new URL("url");
module.exports = class Router {
  constructor() {
    this.routes = [];
  }

  add(method, url, handler) {
    this.routes.push({ method, url, handler });
  }

  resolve(context, request) {
    let path = parse(request.url).pathname;

    for (let { method, url, handler } of this.routes) {
      let match = url.exec(path);
      if (!match || request.method != method) continue;
      let urlPath = match.slice(1).map(decodeURIComponent);
      return handler(context, ...urlPath, request);
    }
    return null;
  }
};
