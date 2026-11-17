// Root page only: pick the visitor's language, default uz.
(function () {
  var langs = (navigator.languages || [navigator.language || ""]).map(function (l) {
    return String(l).slice(0, 2).toLowerCase();
  });
  var pick = "uz";
  for (var i = 0; i < langs.length; i++) {
    if (langs[i] === "uz" || langs[i] === "ru" || langs[i] === "en") {
      pick = langs[i];
      break;
    }
  }
  location.replace("/" + pick + "/");
})();
