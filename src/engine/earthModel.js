/* Simplified PREM-style Earth model: depth (km) -> temperature, pressure, density, wave speeds. Approximate, for education. */
(function () {
  "use strict";
  var R = 6371;
  // depth km, T degC, P GPa, rho g/cm3, Vp km/s, Vs km/s. Repeated depths are real discontinuities (Moho-ish, CMB, ICB).
  var T = [[0, 15, 0, 2.7, 5.8, 3.2], [35, 600, 1.0, 2.9, 6.8, 3.9], [70, 1000, 2.3, 3.3, 8.0, 4.4], [100, 1300, 3.2, 3.37, 8.1, 4.5], [220, 1450, 7.5, 3.45, 8.6, 4.65],
    [410, 1600, 13.5, 3.85, 9.1, 4.9], [660, 1900, 23.8, 4.38, 10.2, 5.6], [1500, 2300, 58, 4.9, 12.2, 6.6], [2000, 2500, 83, 5.1, 12.8, 6.9], [2890, 3700, 135.8, 5.57, 13.7, 7.26],
    [2890, 3700, 135.8, 9.9, 8.06, 0], [3500, 4100, 190, 10.9, 9.2, 0], [4500, 4900, 270, 11.9, 10.0, 0], [5150, 5400, 328.9, 12.17, 10.36, 0],
    [5150, 5400, 328.9, 12.76, 11.03, 3.5], [5800, 5500, 350, 13.0, 11.2, 3.6], [6371, 5500, 363.9, 13.09, 11.26, 3.67]];
  var LAYERS = [
    { id: "crust", name: "Crust", from: 0, to: 70, col: ACC.v.hex, state: "Solid", mineral: "Granite and basalt: quartz, feldspar, pyroxene, olivine", note: "Continental crust averages about 35 km, up to about 70 km under mountains; oceanic crust is 5-10 km." },
    { id: "mantle", name: "Mantle", from: 70, to: 2890, col: ACC.v.hex, state: "Plastic flow", mineral: "Peridotite: olivine, pyroxene, then bridgmanite and ferropericlase in the lower mantle", note: "Solid rock that creeps over geological time. Convection here drives plate tectonics." },
    { id: "outer", name: "Outer core", from: 2890, to: 5150, col: ACC.v.hex, state: "Liquid metal", mineral: "Liquid iron-nickel alloy with some sulfur and oxygen", note: "Its flow drives the geodynamo that makes Earth's magnetic field. S-waves cannot cross it." },
    { id: "inner", name: "Inner core", from: 5150, to: 6371, col: ACC.s.hex, state: "Solid (high pressure)", mineral: "Crystalline iron-nickel alloy", note: "Solid because of the enormous pressure, even though it is about as hot as the Sun's surface." }
  ];
  function at(d) {
    d = Math.max(0, Math.min(R, d));
    var i, a, b, f, out = {};
    for (i = 0; i < T.length - 1; i++) { a = T[i]; b = T[i + 1]; if (b[0] > a[0] && d >= a[0] && (d < b[0] || i === T.length - 2)) break; }
    f = (d - a[0]) / (b[0] - a[0]);
    var L = layerOf(d);
    return { depth: d, T: a[1] + (b[1] - a[1]) * f, P: a[2] + (b[2] - a[2]) * f, rho: a[3] + (b[3] - a[3]) * f, vp: a[4] + (b[4] - a[4]) * f, vs: a[5] + (b[5] - a[5]) * f, layer: L, state: L.state };
  }
  function layerOf(d) { for (var i = 3; i >= 0; i--) if (d >= LAYERS[i].from) return LAYERS[i]; return LAYERS[0]; }
  function volShare(L) { var ro = R - L.from, ri = R - L.to; return (Math.pow(ro, 3) - Math.pow(ri, 3)) / Math.pow(R, 3); }
  window.EarthModel = { R: R, LAYERS: LAYERS, at: at, layerOf: layerOf, volShare: volShare };
})();
