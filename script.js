(function(){
  function loadText(url){
    return fetch(url, {cache:"no-cache"}).then(function(r){
      if(!r.ok) throw new Error("HTTP "+r.status+" "+url);
      return r.text();
    });
  }
  Promise.all([
    loadText("./script-part1.js"),
    loadText("./script-part2.js")
  ]).then(function(parts){
    var s = document.createElement("script");
    s.textContent = parts[0] + "\n" + parts[1];
    document.head.appendChild(s);
  }).catch(function(err){
    console.error("Dhker: failed to load script parts", err);
  });
})();
