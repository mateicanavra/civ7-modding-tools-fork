(function(){
  function codeSlicerPlugin(hook){
    var fenceRe = /```(\w+)([^\n]*)\n([\s\S]*?)\n```/g;
    hook.beforeEach(function(content){
      return content.replace(fenceRe, function(match, lang, info, body){
        var m = /lines=(\d+)(?:-(\d+))?/i.exec(info);
        if(!m) return match;
        var start = parseInt(m[1], 10) || 1;
        var end = m[2] ? parseInt(m[2], 10) : null;
        var lines = body.split(/\r?\n/);
        var from = Math.max(1, start) - 1;
        var to = end ? Math.min(lines.length, end) : lines.length;
        var slice = lines.slice(from, to).join('\n');
        var infoClean = info.replace(/\s*lines=\d+(?:-\d+)?/i, '');
        return '```' + lang + (infoClean||'') + '\n' + slice + '\n```';
      });
    });
  }
  if (typeof window !== 'undefined') {
    window.$docsify = window.$docsify || {};
    window.$docsify.plugins = [].concat(window.$docsify.plugins || [], codeSlicerPlugin);
  }
})();


