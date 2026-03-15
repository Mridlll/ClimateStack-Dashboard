/**
 * ClimateStack Dashboard
 * Lazy-initialized Leaflet maps via IntersectionObserver + Chart.js
 */

// ── Global state ─────────────────────────────────────────────────────────
let climateGeo = null;
let pilotGeo = null;
let summaryData = null;
let timeseriesData = {};
let allDistricts = [];
let initializedMaps = {};         // track which maps have been created
let activeDistrictCharts = { temp: null, precip: null };

// New data files
let projectedData = null;
let vulnerabilityData = null;
let cropCoefficients = null;
let covariateTimeline = null;
let parbhaniDecomposition = null;
let shockCoefficients = null;

// ── Color scales (calibrated to actual data ranges) ──────────────────────

// temp_trend_c_decade: range -0.15 to +0.40
function tempTrendColor(val) {
    if (val == null) return '#d4d4d4';
    const clamped = Math.max(-0.15, Math.min(0.40, val));
    // Normalize to 0-1 where 0 = -0.15, ~0.27 = 0 (neutral), 1 = +0.40
    const t = (clamped + 0.15) / 0.55;
    if (t < 0.27) {
        // Cooling: blue shades
        const s = t / 0.27;
        return `rgb(${Math.round(33 + s * 100)}, ${Math.round(102 + s * 80)}, ${Math.round(230 - s * 30)})`;
    } else if (t < 0.45) {
        // Near zero: pale yellow
        const s = (t - 0.27) / 0.18;
        return `rgb(${Math.round(133 + s * 122)}, ${Math.round(182 + s * 50)}, ${Math.round(200 - s * 90)})`;
    } else if (t < 0.72) {
        // Moderate warming: orange
        const s = (t - 0.45) / 0.27;
        return `rgb(${Math.round(255)}, ${Math.round(232 - s * 100)}, ${Math.round(110 - s * 60)})`;
    } else {
        // Intense warming: deep red
        const s = (t - 0.72) / 0.28;
        return `rgb(${Math.round(255 - s * 60)}, ${Math.round(132 - s * 90)}, ${Math.round(50 - s * 20)})`;
    }
}

// mean_precip_idio_shock: range 56 to 726 mm (p10=97, p90=242)
function shockColor(val) {
    if (val == null) return '#d4d4d4';
    const t = Math.max(0, Math.min(1, (val - 70) / 250));
    if (t < 0.33) {
        const s = t / 0.33;
        return `rgb(${Math.round(30 + s * 60)}, ${Math.round(40 + s * 20)}, ${Math.round(100 + s * 60)})`;
    } else if (t < 0.66) {
        const s = (t - 0.33) / 0.33;
        return `rgb(${Math.round(90 + s * 90)}, ${Math.round(60 - s * 20)}, ${Math.round(160 + s * 30)})`;
    } else {
        const s = (t - 0.66) / 0.34;
        return `rgb(${Math.round(180 + s * 55)}, ${Math.round(40 + s * 60)}, ${Math.round(190 - s * 30)})`;
    }
}

// mean_idiosync_shock: range 0.05 to 0.55
function idioColor(val) {
    if (val == null) return '#d4d4d4';
    const t = Math.max(0, Math.min(1, (val - 0.05) / 0.50));
    if (t < 0.33) {
        const s = t / 0.33;
        return `rgb(255, ${Math.round(250 - s * 20)}, ${Math.round(235 - s * 80)})`;
    } else if (t < 0.66) {
        const s = (t - 0.33) / 0.33;
        return `rgb(255, ${Math.round(230 - s * 80)}, ${Math.round(155 - s * 80)})`;
    } else {
        const s = (t - 0.66) / 0.34;
        return `rgb(${Math.round(255 - s * 50)}, ${Math.round(150 - s * 100)}, ${Math.round(75 - s * 45)})`;
    }
}

// irrigation_share: range 0 to 98
function irrigColor(val) {
    if (val == null) return '#d4d4d4';
    const t = Math.max(0, Math.min(1, val / 98));
    if (t < 0.3) {
        const s = t / 0.3;
        return `rgb(${Math.round(210 - s * 30)}, ${Math.round(180 - s * 20)}, ${Math.round(140 - s * 30)})`;
    } else if (t < 0.6) {
        const s = (t - 0.3) / 0.3;
        return `rgb(${Math.round(180 - s * 80)}, ${Math.round(160 + s * 40)}, ${Math.round(110 - s * 10)})`;
    } else {
        const s = (t - 0.6) / 0.4;
        return `rgb(${Math.round(100 - s * 70)}, ${Math.round(200 - s * 30)}, ${Math.round(100 - s * 50)})`;
    }
}

// projected yield: GCM range 0 to -15%, uses cmip6_yield_kharif_ssp370 if available
function projectedYieldColor(val) {
    if (val == null) return '#d4d4d4';
    var v = Math.min(0, Math.max(-15, val));
    var t = Math.abs(v) / 15; // 0=no decline, 1=-15%
    if (t < 0.2) {
        var s = t / 0.2;
        return `rgb(255, ${Math.round(250 - s * 15)}, ${Math.round(210 - s * 40)})`;
    } else if (t < 0.4) {
        var s = (t - 0.2) / 0.2;
        return `rgb(255, ${Math.round(235 - s * 50)}, ${Math.round(170 - s * 60)})`;
    } else if (t < 0.65) {
        var s = (t - 0.4) / 0.25;
        return `rgb(${Math.round(255 - s * 30)}, ${Math.round(185 - s * 70)}, ${Math.round(110 - s * 60)})`;
    } else if (t < 0.85) {
        var s = (t - 0.65) / 0.2;
        return `rgb(${Math.round(225 - s * 35)}, ${Math.round(115 - s * 55)}, ${Math.round(50 - s * 20)})`;
    } else {
        var s = (t - 0.85) / 0.15;
        return `rgb(${Math.round(190 - s * 50)}, ${Math.round(60 - s * 30)}, ${Math.round(30 - s * 10)})`;
    }
}

// ── Map helpers ──────────────────────────────────────────────────────────

const INDIA_CENTER = [22.5, 82];
const INDIA_BOUNDS = [[6, 68], [37, 98]];

function makeMap(id, dark) {
    const map = L.map(id, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: false
    }).setView(INDIA_CENTER, 5);

    const style = dark ? 'dark_all' : 'light_nolabels';
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`, {
        subdomains: 'abcd',
        maxZoom: 12
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('<a href="https://carto.com/">CARTO</a>')
        .addTo(map);

    return map;
}

function tooltipHtml(p, rows) {
    let h = `<div style="font-family:system-ui;min-width:180px;padding:4px">`;
    h += `<div style="font-weight:700;font-size:13px;margin-bottom:2px">${p.district || '?'}</div>`;
    h += `<div style="font-size:10px;color:#888;margin-bottom:6px">${p.state || ''}</div>`;
    rows.forEach(([label, key, suffix, color]) => {
        const v = p[key];
        const vs = v != null ? (typeof v === 'number' ? v.toFixed(2) : v) : 'N/A';
        const cs = color ? `color:${color}` : '';
        h += `<div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;padding:1px 0">`;
        h += `<span style="color:#666">${label}</span>`;
        h += `<span style="font-weight:600;${cs}">${vs}${suffix || ''}</span></div>`;
    });
    h += `<div style="font-size:9px;color:#aaa;margin-top:6px;text-align:center">Click to explore</div>`;
    h += `</div>`;
    return h;
}

function bindDistrictInteraction(layer, p, rows, opts) {
    opts = opts || {};
    var defaultWeight = opts.weight || 0.3;
    var defaultColor = opts.color || '#999';
    var defaultOpacity = opts.opacity || 0.4;

    layer.bindTooltip(tooltipHtml(p, rows), {
        sticky: false,
        direction: 'auto',
        offset: [0, -8],
        opacity: 0.95,
        className: 'district-tooltip'
    });
    layer.on('mouseover', function(e) {
        layer.setStyle({ weight: 2.5, color: '#ffeb3b', opacity: 1 });
        layer.bringToFront();
        layer.openTooltip(e.latlng);
    });
    layer.on('mousemove', function(e) {
        layer.openTooltip(e.latlng);
    });
    layer.on('mouseout', function() {
        layer.setStyle({ weight: defaultWeight, color: defaultColor, opacity: defaultOpacity });
        layer.closeTooltip();
    });
    layer.on('click', function() {
        showDistrictDeepDive(p.district, p.state);
    });
}

function setGradient(id, colorFn, min, max, n) {
    n = n || 30;
    const el = document.getElementById(id);
    if (!el) return;
    const stops = [];
    for (let i = 0; i <= n; i++) {
        stops.push(colorFn(min + (max - min) * (i / n)));
    }
    el.style.background = `linear-gradient(to right, ${stops.join(',')})`;
}

// ── Lazy map initialization via IntersectionObserver ─────────────────────

function initMapTrends() {
    if (!climateGeo) return;
    const m = makeMap('map-trends', false);
    L.geoJSON(climateGeo, {
        style: function(f) {
            return {
                fillColor: tempTrendColor(f.properties.temp_trend_c_decade),
                fillOpacity: 0.85,
                weight: 0.3,
                color: '#999',
                opacity: 0.4
            };
        },
        onEachFeature: function(f, layer) {
            var p = f.properties;
            bindDistrictInteraction(layer, p, [
                ['Warming', 'temp_trend_c_decade', ' \u00B0C/dec', p.temp_trend_c_decade > 0 ? '#d32f2f' : '#1976d2'],
                ['Avg monsoon temp', 'kharif_mean_temp', ' \u00B0C'],
                ['Avg monsoon rainfall', 'kharif_mean_precip', ' mm'],
                ['Rabi temp', 'rabi_mean_temp', ' \u00B0C']
            ]);
        }
    }).addTo(m);
    m.fitBounds(INDIA_BOUNDS);
    setGradient('gradient-trends', tempTrendColor, -0.15, 0.40);
    initializedMaps.trends = m;
}

function initMapShocks() {
    if (!climateGeo) return;
    var m = makeMap('map-shocks', true);
    L.geoJSON(climateGeo, {
        style: function(f) {
            return {
                fillColor: shockColor(f.properties.mean_precip_idio_shock),
                fillOpacity: 0.85,
                weight: 0.6,
                color: 'rgba(255,255,255,0.15)',
                opacity: 1
            };
        },
        onEachFeature: function(f, layer) {
            var p = f.properties;
            bindDistrictInteraction(layer, p, [
                ['Rainfall volatility', 'mean_precip_idio_shock', ' mm'],
                ['Avg monsoon rainfall', 'kharif_mean_precip', ' mm'],
                ['Rainfall change/decade', 'precip_trend_mm_decade', ' mm']
            ], { weight: 0.6, color: 'rgba(255,255,255,0.15)', opacity: 1 });
        }
    }).addTo(m);
    m.fitBounds(INDIA_BOUNDS);
    setGradient('gradient-shocks', shockColor, 70, 320);
    initializedMaps.shocks = m;

    // Covariate timeline chart
    initCovariateTimeline();
}

function initMapIdiosyncratic() {
    if (!climateGeo) return;
    var m = makeMap('map-idiosyncratic', false);
    L.geoJSON(climateGeo, {
        style: function(f) {
            return {
                fillColor: idioColor(f.properties.mean_idiosync_shock),
                fillOpacity: 0.85,
                weight: 0.3,
                color: '#999',
                opacity: 0.4
            };
        },
        onEachFeature: function(f, layer) {
            var p = f.properties;
            bindDistrictInteraction(layer, p, [
                ['Heat shock severity', 'mean_idiosync_shock', ' \u00B0C'],
                ['Rainfall shock severity', 'mean_precip_idio_shock', ' mm'],
                ['Avg monsoon temp', 'kharif_mean_temp', ' \u00B0C']
            ]);
        }
    }).addTo(m);
    m.fitBounds(INDIA_BOUNDS);
    setGradient('gradient-idio', idioColor, 0.05, 0.55);
    initializedMaps.idiosyncratic = m;

    // Crop sensitivity chart (dot + whisker)
    initCropSensitivityChart();
}

function initMapIrrigation() {
    if (!pilotGeo || !pilotGeo.features || pilotGeo.features.length === 0) return;
    var m = makeMap('map-irrigation', false);
    var geoLayer = L.geoJSON(pilotGeo, {
        style: function(f) {
            return {
                fillColor: irrigColor(f.properties.irrigation_share),
                fillOpacity: 0.85,
                weight: 1,
                color: '#fff',
                opacity: 0.5
            };
        },
        onEachFeature: function(f, layer) {
            var p = f.properties;
            var rows = [
                ['Irrigation', 'irrigation_share', '%', p.irrigation_share > 40 ? '#2e7d32' : '#bf360c'],
                ['Vulnerability', 'vulnerability_score', ''],
                ['Warming', 'temp_trend_c_decade', ' \u00B0C/dec']
            ];
            if (p.crop1_name) rows.push(['Top crop', 'crop1_name', '']);
            bindDistrictInteraction(layer, p, rows, { weight: 1, color: '#fff', opacity: 0.5 });
        }
    }).addTo(m);
    m.fitBounds(geoLayer.getBounds());
    setGradient('gradient-irrigation', irrigColor, 0, 98);
    initializedMaps.irrigation = m;

    // Irrigation split chart
    initIrrigationChart();
}

// Crop-specific temperature betas (idiosyncratic, most negative per crop)
var cropBetas = {
    'All Crops': null,
    'Rice': -0.009,
    'Wheat': -0.045,
    'Maize': -0.054,
    'Moong': -0.076,
    'Arhar/Tur': -0.153,
    'Gram': -0.049,
    'Jowar': -0.106,
    'Bajra': -0.052,
    'Groundnut': -0.031,
    'Soyabean': -0.124
};

function initMapProjected2035() {
    if (!climateGeo) return;
    var m = makeMap('map-projected', false);

    // Build lookup from projectedData (cmip6_projections.json) if available
    var projLookup = {};
    if (projectedData) {
        Object.keys(projectedData).forEach(function(district) {
            projLookup[district] = projectedData[district];
        });
    }

    var projectedGeoLayer = null;
    var projectedLayerLookup = {};  // district -> layer
    var projectedPropsLookup = {};  // district -> merged properties

    projectedGeoLayer = L.geoJSON(climateGeo, {
        style: function(f) {
            var p = f.properties;
            var proj = projLookup[p.district];
            var yieldPct = p.crop_weighted_yield_ssp370 || p.cmip6_yield_kharif_ssp370 || (proj ? proj.projected_yield_pct_2035 : null) || p.projected_yield_pct_2035 || null;
            return {
                fillColor: projectedYieldColor(yieldPct),
                fillOpacity: 0.85,
                weight: 0.3,
                color: '#999',
                opacity: 0.4
            };
        },
        onEachFeature: function(f, layer) {
            var p = f.properties;
            var proj = projLookup[p.district] || {};
            var merged = Object.assign({}, p, proj);
            projectedLayerLookup[p.district] = layer;
            projectedPropsLookup[p.district] = merged;
            bindDistrictInteraction(layer, merged, [
                ['GCM warming (SSP3-7.0)', 'cmip6_warming_ssp370', ' \u00B0C', '#d32f2f'],
                ['Yield impact (crop-weighted)', 'crop_weighted_yield_ssp370', '%', '#d32f2f'],
                ['Kharif yield impact (pooled)', 'cmip6_yield_kharif_ssp370', '%', '#d32f2f'],
                ['Warming trend (observed)', 'temp_trend_c_decade', ' \u00B0C/dec']
            ]);
        }
    }).addTo(m);
    m.fitBounds(INDIA_BOUNDS);
    setGradient('gradient-projected', projectedYieldColor, 0, -15);

    // Compute and display initial stats
    function updateProjectedStats(cropName) {
        var impacts = [];
        var worstImpact = 0;
        var worstDistrict = '';

        Object.keys(projectedLayerLookup).forEach(function(district) {
            var layer = projectedLayerLookup[district];
            var props = projectedPropsLookup[district];
            var warming = props.cmip6_warming_ssp370 || props.projected_kharif_warming_2035_ssp370;
            var yieldPct;

            if (cropName === 'All Crops' || !cropBetas[cropName]) {
                yieldPct = props.crop_weighted_yield_ssp370 || props.cmip6_yield_kharif_ssp370 || null;
            } else {
                if (warming != null) {
                    yieldPct = warming * cropBetas[cropName] * 100;
                } else {
                    yieldPct = null;
                }
            }

            if (yieldPct != null) {
                layer.setStyle({ fillColor: projectedYieldColor(yieldPct) });
                impacts.push(yieldPct);
                if (yieldPct < worstImpact) {
                    worstImpact = yieldPct;
                    worstDistrict = district;
                }
                // Update tooltip for crop-specific
                if (cropName !== 'All Crops') {
                    layer.unbindTooltip();
                    var tooltipProps = Object.assign({}, props, {
                        _crop_yield_impact: yieldPct
                    });
                    layer.bindTooltip(tooltipHtml(tooltipProps, [
                        ['Crop', '_selected_crop', ''],
                        ['GCM warming', 'cmip6_warming_ssp370', ' \u00B0C', '#d32f2f'],
                        ['Yield impact (' + cropName + ')', '_crop_yield_impact', '%', '#d32f2f'],
                        ['Warming trend (observed)', 'temp_trend_c_decade', ' \u00B0C/dec']
                    ]), {
                        sticky: false, direction: 'auto', offset: [0, -8],
                        opacity: 0.95, className: 'district-tooltip'
                    });
                    tooltipProps._selected_crop = cropName;
                }
            } else {
                layer.setStyle({ fillColor: '#d4d4d4' });
            }
        });

        // Update stats overlay
        var avgEl = document.getElementById('projected-avg-impact');
        var worstEl = document.getElementById('projected-worst-district');
        if (avgEl && impacts.length > 0) {
            var avg = impacts.reduce(function(a, b) { return a + b; }, 0) / impacts.length;
            avgEl.textContent = avg.toFixed(1) + '%';
        }
        if (worstEl) {
            worstEl.textContent = worstDistrict || '--';
        }
    }

    // Initial stats
    updateProjectedStats('All Crops');

    // Crop dropdown listener
    var cropSelect = document.getElementById('crop-projection-select');
    if (cropSelect) {
        cropSelect.addEventListener('change', function() {
            updateProjectedStats(cropSelect.value);
        });
    }

    initializedMaps.projected = m;
}

// ── SSP Comparison Maps ──────────────────────────────────────────────────

function initSSPCompare() {
    if (!climateGeo) return;

    // Build lookup from projectedData
    var projLookup = {};
    if (projectedData) {
        Object.keys(projectedData).forEach(function(district) {
            projLookup[district] = projectedData[district];
        });
    }

    var m245 = makeMap('map-ssp245', false);
    var m585 = makeMap('map-ssp585', false);

    // SSP2-4.5 map (left)
    L.geoJSON(climateGeo, {
        style: function(f) {
            var p = f.properties;
            var proj = projLookup[p.district];
            var yieldPct = p.crop_weighted_yield_ssp245 || (proj ? proj.crop_weighted_yield_ssp245 : null) || null;
            return {
                fillColor: projectedYieldColor(yieldPct),
                fillOpacity: 0.85,
                weight: 0.3,
                color: '#999',
                opacity: 0.4
            };
        },
        onEachFeature: function(f, layer) {
            var p = f.properties;
            var proj = projLookup[p.district] || {};
            var merged = Object.assign({}, p, proj);
            bindDistrictInteraction(layer, merged, [
                ['Yield impact (SSP2-4.5)', 'crop_weighted_yield_ssp245', '%', '#d32f2f'],
                ['Warming (SSP2-4.5)', 'projected_kharif_warming_2035_ssp245', ' \u00B0C', '#d32f2f'],
                ['Warming trend (observed)', 'temp_trend_c_decade', ' \u00B0C/dec']
            ]);
        }
    }).addTo(m245);
    m245.fitBounds(INDIA_BOUNDS);

    // SSP5-8.5 map (right)
    L.geoJSON(climateGeo, {
        style: function(f) {
            var p = f.properties;
            var proj = projLookup[p.district];
            var yieldPct = p.crop_weighted_yield_ssp370 || (proj ? proj.crop_weighted_yield_ssp370 : null) || null;
            return {
                fillColor: projectedYieldColor(yieldPct),
                fillOpacity: 0.85,
                weight: 0.3,
                color: '#999',
                opacity: 0.4
            };
        },
        onEachFeature: function(f, layer) {
            var p = f.properties;
            var proj = projLookup[p.district] || {};
            var merged = Object.assign({}, p, proj);
            bindDistrictInteraction(layer, merged, [
                ['Yield impact (SSP5-8.5)', 'crop_weighted_yield_ssp370', '%', '#d32f2f'],
                ['GCM warming (SSP5-8.5)', 'cmip6_warming_ssp370', ' \u00B0C', '#d32f2f'],
                ['Warming trend (observed)', 'temp_trend_c_decade', ' \u00B0C/dec']
            ]);
        }
    }).addTo(m585);
    m585.fitBounds(INDIA_BOUNDS);

    setGradient('gradient-ssp-compare', projectedYieldColor, 0, -15);

    // Sync map panning/zooming
    function syncMaps(source, target) {
        source.on('moveend', function() {
            target.setView(source.getCenter(), source.getZoom(), { animate: false });
        });
    }
    syncMaps(m245, m585);
    syncMaps(m585, m245);

    initializedMaps['ssp-compare'] = m245;
    // Store second map for invalidation
    initializedMaps['ssp-compare-585'] = m585;
}

// ── Variance Decomposition Chart ─────────────────────────────────────────

function initVarianceDecomp() {
    var ctx = document.getElementById('chart-variance-decomp');
    if (!ctx) return;

    var decompColors = {
        'Baseline': '#5c6bc0',
        'Seasonality': '#26a69a',
        'Covariate': '#ff9800',
        'Idiosyncratic': '#ef5350',
        'Trend': '#78909c'
    };

    var tempData = [55, 43, 0.8, 1.2, 0.05];
    var precipData = [20, 62, 2.2, 16, 0.1];
    var components = ['Baseline', 'Seasonality', 'Covariate', 'Idiosyncratic', 'Trend'];

    var policyMap = {
        'Baseline': 'Crop choice (already adapted)',
        'Seasonality': 'Planting calendar optimization',
        'Covariate': 'Parametric insurance (ENSO triggers)',
        'Idiosyncratic': 'Index/indemnity insurance',
        'Trend': 'Long-term infrastructure investment'
    };

    var datasets = components.map(function(comp, i) {
        return {
            label: comp,
            data: [tempData[i], precipData[i]],
            backgroundColor: decompColors[comp],
            borderColor: decompColors[comp],
            borderWidth: 0,
            borderRadius: 2
        };
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Temperature', 'Precipitation'],
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, usePointStyle: true, boxWidth: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var comp = context.dataset.label;
                            var val = context.raw;
                            var policy = policyMap[comp] || '';
                            return comp + ': ' + val.toFixed(1) + '% — ' + policy;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    max: 100,
                    title: { display: true, text: 'Variance Share (%)', font: { size: 11 } },
                    grid: { color: '#eee' },
                    ticks: {
                        font: { size: 10 },
                        callback: function(val) { return val + '%'; }
                    }
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { font: { size: 12, weight: 'bold' } }
                }
            }
        }
    });

    initializedMaps['variance-decomp'] = true;
}

function initVulnerabilityScatter() {
    var ctx = document.getElementById('chart-vulnerability-scatter');
    if (!ctx) return;

    // State color map
    var stateColors = {
        'Maharashtra': '#d32f2f',
        'Uttar Pradesh': '#1976d2',
        'Karnataka': '#2e7d32'
    };
    var defaultColor = '#9e9e9e';

    // Marathwada districts to label
    var marathwada = ['Parbhani', 'Latur', 'Hingoli', 'Nanded', 'Osmanabad', 'Beed', 'Jalna', 'Aurangabad'];

    if (vulnerabilityData && vulnerabilityData.length > 0) {
        // Group by state
        var stateGroups = {};
        vulnerabilityData.forEach(function(d) {
            var st = d.state || 'Other';
            if (!stateGroups[st]) stateGroups[st] = [];
            stateGroups[st].push(d);
        });

        var datasets = Object.keys(stateGroups).map(function(state) {
            return {
                label: state,
                data: stateGroups[state].map(function(d) {
                    return { x: d.irrigation, y: d.projected_yield, district: d.district };
                }),
                backgroundColor: stateColors[state] || defaultColor,
                pointRadius: 5,
                pointHoverRadius: 8
            };
        });

        new Chart(ctx, {
            type: 'scatter',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 }, usePointStyle: true, boxWidth: 8 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var d = context.raw;
                                return d.district + ' — Irrig: ' + d.x.toFixed(0) + '%, Yield: ' + d.y.toFixed(1) + '%';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Irrigation Share (%)', font: { size: 12 } },
                        min: 0,
                        max: 100,
                        grid: { color: '#eee' },
                        ticks: { font: { size: 10 } }
                    },
                    y: {
                        title: { display: true, text: 'Projected Yield Impact (%) by 2035', font: { size: 12 } },
                        grid: { color: '#eee' },
                        ticks: { font: { size: 10 } }
                    }
                }
            },
            plugins: [{
                afterDraw: function(chart) {
                    var ctx2 = chart.ctx;
                    // Draw quadrant lines
                    var xScale = chart.scales.x;
                    var yScale = chart.scales.y;
                    var midX = xScale.getPixelForValue(40);
                    var midY = yScale.getPixelForValue(-5);

                    ctx2.save();
                    ctx2.strokeStyle = 'rgba(0,0,0,0.15)';
                    ctx2.lineWidth = 1;
                    ctx2.setLineDash([5, 5]);
                    // Vertical line at 40% irrigation
                    ctx2.beginPath();
                    ctx2.moveTo(midX, yScale.top);
                    ctx2.lineTo(midX, yScale.bottom);
                    ctx2.stroke();
                    // Horizontal line at -5% yield
                    ctx2.beginPath();
                    ctx2.moveTo(xScale.left, midY);
                    ctx2.lineTo(xScale.right, midY);
                    ctx2.stroke();
                    ctx2.setLineDash([]);

                    // Quadrant labels
                    ctx2.fillStyle = 'rgba(0,0,0,0.25)';
                    ctx2.font = '10px system-ui';
                    ctx2.fillText('HIGH RISK', xScale.left + 8, yScale.top + 14);
                    ctx2.fillText('BUFFERED', xScale.right - 70, yScale.top + 14);
                    ctx2.fillText('LOW RISK', xScale.right - 60, yScale.bottom - 8);

                    // Label Marathwada districts
                    ctx2.fillStyle = '#d32f2f';
                    ctx2.font = 'bold 9px system-ui';
                    chart.data.datasets.forEach(function(ds) {
                        ds.data.forEach(function(pt, idx) {
                            if (marathwada.indexOf(pt.district) !== -1) {
                                var meta = chart.getDatasetMeta(chart.data.datasets.indexOf(ds));
                                var elem = meta.data[idx];
                                if (elem) {
                                    ctx2.fillText(pt.district, elem.x + 6, elem.y - 4);
                                }
                            }
                        });
                    });
                    ctx2.restore();
                }
            }]
        });
    } else {
        // Fallback: show placeholder message
        var parent = ctx.parentElement;
        if (parent) {
            parent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-style:italic">Vulnerability scatter data loading...</div>';
        }
    }

    initializedMaps.vulnerability = true; // mark as initialized to prevent re-init
}

// ── Shock Explorer ──────────────────────────────────────────────────────

// Color scale: green (+5%) -> yellow (0%) -> red (-15%)
function shockImpactColor(pct) {
    if (pct == null || isNaN(pct)) return '#d4d4d4';
    // Clamp to -15..+5
    var v = Math.max(-15, Math.min(5, pct));
    // Normalize: +5 -> 0, 0 -> 0.25, -15 -> 1
    var t = (5 - v) / 20; // 0 at +5, 1 at -15
    if (t < 0.15) {
        // Green zone (+5 to +2)
        var s = t / 0.15;
        return 'rgb(' + Math.round(80 + s * 60) + ',' + Math.round(200 - s * 20) + ',' + Math.round(80 + s * 20) + ')';
    } else if (t < 0.35) {
        // Green to yellow (+2 to -2)
        var s = (t - 0.15) / 0.20;
        return 'rgb(' + Math.round(140 + s * 115) + ',' + Math.round(180 + s * 55) + ',' + Math.round(100 - s * 60) + ')';
    } else if (t < 0.55) {
        // Yellow to orange (-2 to -6)
        var s = (t - 0.35) / 0.20;
        return 'rgb(' + Math.round(255) + ',' + Math.round(235 - s * 80) + ',' + Math.round(40 - s * 20) + ')';
    } else if (t < 0.80) {
        // Orange to red (-6 to -11)
        var s = (t - 0.55) / 0.25;
        return 'rgb(' + Math.round(255 - s * 30) + ',' + Math.round(155 - s * 100) + ',' + Math.round(20 + s * 10) + ')';
    } else {
        // Deep red (-11 to -15)
        var s = (t - 0.80) / 0.20;
        return 'rgb(' + Math.round(225 - s * 50) + ',' + Math.round(55 - s * 30) + ',' + Math.round(30 - s * 10) + ')';
    }
}

function initShockExplorer() {
    if (!pilotGeo || !pilotGeo.features || pilotGeo.features.length === 0) return;
    if (!shockCoefficients) return;

    var m = makeMap('map-shock-explorer', false);
    var layerLookup = {};      // district name -> Leaflet layer
    var coeffLookup = {};      // district name -> coefficients
    var currentSeason = 'kharif';

    // Build coefficient lookup (case-insensitive matching)
    var coeffKeys = Object.keys(shockCoefficients);
    coeffKeys.forEach(function(k) {
        coeffLookup[k.toUpperCase()] = shockCoefficients[k];
        coeffLookup[k] = shockCoefficients[k];
    });

    // Compute impact for a single district
    function computeImpact(districtName, tempShock, precipShock, season) {
        var coeff = coeffLookup[districtName] || coeffLookup[districtName.toUpperCase()];
        if (!coeff) return null;
        var tempBeta = coeff[season + '_temp_beta'];
        var precipBeta = coeff[season + '_precip_beta'];
        if (tempBeta == null || precipBeta == null) return null;
        // impact_pct = temp_shock * temp_beta * 100 + precip_shock * precip_beta * 100
        return tempShock * tempBeta * 100 + precipShock * precipBeta * 100;
    }

    // Create GeoJSON layer
    var geoLayer = L.geoJSON(pilotGeo, {
        style: function(f) {
            return {
                fillColor: '#d4d4d4',
                fillOpacity: 0.85,
                weight: 1,
                color: '#fff',
                opacity: 0.5
            };
        },
        onEachFeature: function(f, layer) {
            var p = f.properties;
            layerLookup[p.district] = layer;
            // Tooltip will be updated dynamically
            layer.bindTooltip('', {
                sticky: true,
                direction: 'top',
                offset: [0, -10],
                opacity: 0.95,
                className: 'district-tooltip'
            });
            layer.on('mouseover', function() {
                layer.setStyle({ weight: 2.5, color: '#ffeb3b', opacity: 1 });
                layer.bringToFront();
            });
            layer.on('mouseout', function() {
                layer.setStyle({ weight: 1, color: '#fff', opacity: 0.5 });
            });
            layer.on('click', function() {
                showDistrictDeepDive(p.district, p.state);
            });
        }
    }).addTo(m);
    m.fitBounds(geoLayer.getBounds());

    // Set legend gradient
    setGradient('gradient-shock', shockImpactColor, 5, -15);

    // Update all districts with current slider values
    function updateAllDistricts() {
        var tempShock = parseFloat(document.getElementById('slider-temp').value);
        var precipShock = parseFloat(document.getElementById('slider-precip').value);
        var season = currentSeason;

        var impacts = [];
        var worstImpact = 0;
        var worstDistrict = '';

        Object.keys(layerLookup).forEach(function(districtName) {
            var layer = layerLookup[districtName];
            var impact = computeImpact(districtName, tempShock, precipShock, season);

            if (impact != null) {
                layer.setStyle({ fillColor: shockImpactColor(impact) });
                impacts.push(impact);

                // Build tooltip
                var coeff = coeffLookup[districtName] || coeffLookup[districtName.toUpperCase()] || {};
                var irrShare = coeff.irrigation_share != null ? coeff.irrigation_share.toFixed(0) + '%' : 'N/A';
                var topCrop = coeff.top_crop || 'N/A';
                var html = '<div style="font-family:system-ui;min-width:190px;padding:4px">';
                html += '<div style="font-weight:700;font-size:13px;margin-bottom:2px">' + districtName + '</div>';
                html += '<div style="font-size:10px;color:#888;margin-bottom:6px">' + (coeff.state || '') + '</div>';
                html += '<div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;padding:1px 0">';
                html += '<span style="color:#666">Yield impact</span>';
                html += '<span style="font-weight:600;color:' + (impact < 0 ? '#d32f2f' : '#2e7d32') + '">' + impact.toFixed(1) + '%</span></div>';
                html += '<div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;padding:1px 0">';
                html += '<span style="color:#666">Irrigation</span>';
                html += '<span style="font-weight:600">' + irrShare + '</span></div>';
                html += '<div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;padding:1px 0">';
                html += '<span style="color:#666">Top crop</span>';
                html += '<span style="font-weight:600">' + topCrop + '</span></div>';
                html += '</div>';
                layer.setTooltipContent(html);

                if (impact < worstImpact) {
                    worstImpact = impact;
                    worstDistrict = districtName;
                }
            } else {
                layer.setStyle({ fillColor: '#d4d4d4' });
            }
        });

        // Update stats overlay
        if (impacts.length > 0) {
            var avg = impacts.reduce(function(a, b) { return a + b; }, 0) / impacts.length;
            document.getElementById('shock-avg-impact').textContent = avg.toFixed(1) + '%';
            document.getElementById('shock-worst-district').textContent = worstDistrict || '--';
        }
    }

    // Slider event listeners
    var sliderTemp = document.getElementById('slider-temp');
    var sliderPrecip = document.getElementById('slider-precip');
    var tempLabel = document.getElementById('slider-temp-value');
    var precipLabel = document.getElementById('slider-precip-value');

    function onSliderChange() {
        var t = parseFloat(sliderTemp.value);
        var p = parseFloat(sliderPrecip.value);
        tempLabel.innerHTML = (t >= 0 ? '+' : '') + t.toFixed(1) + '&deg;C';
        precipLabel.innerHTML = (p >= 0 ? '+' : '&minus;') + Math.abs(p) + ' mm';
        updateAllDistricts();
    }

    sliderTemp.addEventListener('input', onSliderChange);
    sliderPrecip.addEventListener('input', onSliderChange);

    // Season toggle buttons
    var seasonBtns = document.querySelectorAll('#section-shock-explorer .season-btn');
    seasonBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            seasonBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            currentSeason = btn.getAttribute('data-season');
            updateAllDistricts();
        });
    });

    // Initial render
    updateAllDistricts();

    initializedMaps['shock-explorer'] = m;
}

// Map name -> init function
var mapInitFns = {
    trends: initMapTrends,
    shocks: initMapShocks,
    idiosyncratic: initMapIdiosyncratic,
    irrigation: initMapIrrigation,
    projected: initMapProjected2035,
    'shock-explorer': initShockExplorer,
    vulnerability: initVulnerabilityScatter,
    'ssp-compare': initSSPCompare,
    'variance-decomp': initVarianceDecomp
};

function setupMapObservers() {
    var sections = document.querySelectorAll('[data-map]');
    if (!sections.length) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var mapName = entry.target.getAttribute('data-map');
                if (mapName && !initializedMaps[mapName] && mapInitFns[mapName]) {
                    // Small delay to ensure DOM layout is settled
                    setTimeout(function() {
                        mapInitFns[mapName]();
                    }, 100);
                }
                // If map already exists and is a Leaflet map, invalidate size
                if (initializedMaps[mapName] && typeof initializedMaps[mapName].invalidateSize === 'function') {
                    initializedMaps[mapName].invalidateSize();
                }
                // Also invalidate paired map for SSP comparison
                if (mapName === 'ssp-compare' && initializedMaps['ssp-compare-585'] && typeof initializedMaps['ssp-compare-585'].invalidateSize === 'function') {
                    initializedMaps['ssp-compare-585'].invalidateSize();
                }
            }
        });
    }, {
        rootMargin: '200px 0px',
        threshold: 0.01
    });

    sections.forEach(function(section) {
        observer.observe(section);
    });
}

// ── Chart initializers ──────────────────────────────────────────────────

function initCovariateTimeline() {
    var ctx = document.getElementById('chart-covariate-shocks');
    if (!ctx) return;

    var years, precipShocks, tempShocks;

    if (covariateTimeline && covariateTimeline.years) {
        // Use the full timeline data file
        years = covariateTimeline.years;
        precipShocks = covariateTimeline.precip_shocks_mm || covariateTimeline.precip_shocks;
        tempShocks = covariateTimeline.temp_shocks_c || covariateTimeline.temp_shocks;
    } else if (summaryData) {
        // Fallback: combine drought and heat year shocks
        var allShocks = {};
        if (summaryData.drought_year_covariate_shocks) {
            Object.keys(summaryData.drought_year_covariate_shocks).forEach(function(y) {
                allShocks[y] = summaryData.drought_year_covariate_shocks[y];
            });
        }
        if (summaryData.heat_year_covariate_shocks) {
            Object.keys(summaryData.heat_year_covariate_shocks).forEach(function(y) {
                if (!allShocks[y]) allShocks[y] = summaryData.heat_year_covariate_shocks[y];
            });
        }
        years = Object.keys(allShocks).sort();
        precipShocks = years.map(function(y) { return allShocks[y]; });
        tempShocks = null;
    } else {
        return;
    }

    if (!years || years.length === 0) return;

    // Key years to annotate
    var keyYears = { '2002': 'El Nino Drought', '2009': 'Drought', '2014': 'Drought', '2015': 'Drought', '2019': 'Excess Monsoon' };

    var datasets = [{
        label: 'Precipitation anomaly (mm)',
        data: precipShocks,
        backgroundColor: precipShocks.map(function(v) {
            if (v == null) return 'rgba(150,150,150,0.3)';
            return v < 0 ? 'rgba(211,47,47,0.75)' : 'rgba(25,118,210,0.65)';
        }),
        borderRadius: 3
    }];

    if (tempShocks) {
        datasets.push({
            label: 'Temperature anomaly (\u00B0C)',
            data: tempShocks,
            type: 'line',
            borderColor: '#ff9800',
            backgroundColor: 'rgba(255,152,0,0.1)',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
            yAxisID: 'y1',
            fill: false
        });
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: tempShocks ? true : false,
                    position: 'bottom',
                    labels: { font: { size: 10 }, usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            var yr = String(context.label);
                            return keyYears[yr] ? keyYears[yr] : '';
                        }
                    }
                }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Precipitation anomaly (mm)', font: { size: 11 } },
                    grid: { color: 'rgba(200,200,200,0.3)' },
                    ticks: { font: { size: 10 } }
                },
                y1: tempShocks ? {
                    position: 'right',
                    title: { display: true, text: 'Temp anomaly (\u00B0C)', font: { size: 11 } },
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                } : undefined,
                x: {
                    ticks: { maxRotation: 45, font: { size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });
}

function initCropSensitivityChart() {
    var ctx = document.getElementById('chart-crop-sensitivity');
    if (!ctx) return;

    // Default hardcoded data
    var crops = ['Moong', 'Gram', 'Wheat', 'Arhar/Tur', 'Soyabean', 'Bajra', 'Maize', 'Groundnut', 'Rice'];
    var betas = [-18.9, -18.1, -16.0, -15.9, -10.6, -9.7, -9.0, -8.2, -1.9];
    var ciLower = [-23.5, -23.0, -21.0, -20.8, -15.0, -14.2, -13.5, -12.8, -5.0];
    var ciUpper = [-14.3, -13.2, -11.0, -11.0, -6.2, -5.2, -4.5, -3.6, 1.2];
    var significant = [true, true, true, true, true, true, true, true, false];

    // Override with data file if available — filter to significant + deduplicate (keep most negative per crop)
    if (cropCoefficients && cropCoefficients.length > 0) {
        // Only significant, only negative (damage), deduplicate by crop name (keep most negative)
        var sigOnly = cropCoefficients.filter(function(d) { return d.significant !== false && d.beta < 0; });
        var bestPerCrop = {};
        sigOnly.forEach(function(d) {
            if (!bestPerCrop[d.crop] || d.beta < bestPerCrop[d.crop].beta) {
                bestPerCrop[d.crop] = d;
            }
        });
        var sorted = Object.values(bestPerCrop).sort(function(a, b) { return a.beta - b.beta; });
        // Scale to percentage (* 100) if values are in decimal form (< 1)
        var scale = Math.abs(sorted[0].beta) < 1 ? 100 : 1;
        crops = sorted.map(function(d) { return d.crop; });
        betas = sorted.map(function(d) { return d.beta * scale; });
        ciLower = sorted.map(function(d) { return d.ci_lower * scale; });
        ciUpper = sorted.map(function(d) { return d.ci_upper * scale; });
        significant = sorted.map(function() { return true; });
    }

    // Draw dot-and-whisker as a custom chart
    // Using a horizontal bar chart with error bars drawn via plugin
    var colors = betas.map(function(v, i) {
        if (!significant[i]) return 'rgba(158,158,158,0.6)'; // grey for non-significant
        var t = Math.min(1, Math.abs(v) / 20);
        return `rgba(229, 57, 53, ${0.4 + t * 0.5})`;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: crops,
            datasets: [{
                data: betas,
                backgroundColor: colors,
                borderColor: colors.map(function(c) { return c.replace(/[\d.]+\)$/, '1)'); }),
                borderWidth: 1,
                borderRadius: 2,
                barThickness: 14
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var idx = context.dataIndex;
                            var sig = significant[idx] ? '' : ' (not significant)';
                            return context.raw.toFixed(1) + '% [' + ciLower[idx].toFixed(1) + ', ' + ciUpper[idx].toFixed(1) + ']' + sig;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: '% yield loss per 1\u03C3 shock (with 90% CI)', font: { size: 11 } },
                    grid: { color: '#eee' },
                    ticks: { font: { size: 10 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                }
            }
        },
        plugins: [{
            afterDraw: function(chart) {
                var ctx2 = chart.ctx;
                var yScale = chart.scales.y;
                var xScale = chart.scales.x;
                var meta = chart.getDatasetMeta(0);

                ctx2.save();
                meta.data.forEach(function(bar, idx) {
                    var lo = xScale.getPixelForValue(ciLower[idx]);
                    var hi = xScale.getPixelForValue(ciUpper[idx]);
                    var yPos = bar.y;
                    var whiskerColor = significant[idx] ? 'rgba(50,50,50,0.7)' : 'rgba(158,158,158,0.5)';

                    ctx2.strokeStyle = whiskerColor;
                    ctx2.lineWidth = 1.5;

                    // Horizontal line (whisker)
                    ctx2.beginPath();
                    ctx2.moveTo(lo, yPos);
                    ctx2.lineTo(hi, yPos);
                    ctx2.stroke();

                    // Caps
                    ctx2.beginPath();
                    ctx2.moveTo(lo, yPos - 4);
                    ctx2.lineTo(lo, yPos + 4);
                    ctx2.stroke();

                    ctx2.beginPath();
                    ctx2.moveTo(hi, yPos - 4);
                    ctx2.lineTo(hi, yPos + 4);
                    ctx2.stroke();
                });

                // Draw zero line
                var zeroX = xScale.getPixelForValue(0);
                ctx2.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx2.lineWidth = 1;
                ctx2.setLineDash([3, 3]);
                ctx2.beginPath();
                ctx2.moveTo(zeroX, yScale.top);
                ctx2.lineTo(zeroX, yScale.bottom);
                ctx2.stroke();

                ctx2.restore();
            }
        }]
    });
}

function initIrrigationChart() {
    var ctx = document.getElementById('chart-irrigation-split');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Temp\nidiosyncratic', 'Temp\ncovariate', 'Precip\ncovariate'],
            datasets: [
                {
                    label: 'High irrigation (>50%)',
                    data: [-3.0, -1.0, 3.5],
                    backgroundColor: '#43a047',
                    borderRadius: 3
                },
                {
                    label: 'Low irrigation (<50%)',
                    data: [-6.0, -2.5, 2.0],
                    backgroundColor: '#e65100',
                    borderRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11 }, usePointStyle: true, boxWidth: 8 }
                }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Yield impact (%)', font: { size: 11 } },
                    grid: { color: '#eee' },
                    ticks: { font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
}

// ── District deep dive ──────────────────────────────────────────────────

function showDistrictDeepDive(districtName, stateName) {
    document.getElementById('deepdive-district').textContent = districtName;
    document.getElementById('deepdive-state').textContent = stateName || '';

    // Update section header to reflect the selected district
    var headerEl = document.querySelector('#section-deepdive .section-header h2');
    if (headerEl) {
        headerEl.textContent = 'Decomposition in Action: ' + districtName + (stateName ? ', ' + stateName : '');
    }

    // Find district properties from GeoJSON for summary stats
    var districtProps = null;
    if (climateGeo && climateGeo.features) {
        var match = climateGeo.features.find(function(f) { return f.properties.district === districtName; });
        if (match) districtProps = match.properties;
    }

    var ts = timeseriesData[districtName];
    if (!ts) {
        // No timeseries but show what we know from the climate GeoJSON
        if (activeDistrictCharts.temp) { activeDistrictCharts.temp.destroy(); activeDistrictCharts.temp = null; }
        if (activeDistrictCharts.precip) { activeDistrictCharts.precip.destroy(); activeDistrictCharts.precip = null; }

        var metaHtml = '';
        if (districtProps) {
            metaHtml += '<div class="deepdive-stats">';
            metaHtml += '<h4>Climate Summary (1997-2020)</h4>';
            metaHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">';
            var items = [
                ['Warming rate', districtProps.temp_trend_c_decade, '\u00B0C/decade', districtProps.temp_trend_c_decade > 0 ? '#d32f2f' : '#1976d2'],
                ['Rainfall change/decade', districtProps.precip_trend_mm_decade, ' mm', districtProps.precip_trend_mm_decade < 0 ? '#d32f2f' : '#1976d2'],
                ['Avg monsoon temperature', districtProps.kharif_mean_temp, '\u00B0C', ''],
                ['Avg monsoon rainfall', districtProps.kharif_mean_precip, ' mm', ''],
                ['Regional shock exposure', districtProps.mean_covariate_shock, '\u00B0C', ''],
                ['Local heat shock severity', districtProps.mean_idiosync_shock, '\u00B0C', '']
            ];
            items.forEach(function(item) {
                var val = item[1] != null ? (typeof item[1] === 'number' ? item[1].toFixed(3) : item[1]) : 'N/A';
                var color = item[3] ? 'color:' + item[3] : '';
                metaHtml += '<div style="background:#f9fafb;padding:10px 14px;border-radius:8px">';
                metaHtml += '<div style="font-size:0.7rem;color:#888;text-transform:uppercase;letter-spacing:0.5px">' + item[0] + '</div>';
                metaHtml += '<div style="font-size:1.1rem;font-weight:700;' + color + '">' + val + item[2] + '</div>';
                metaHtml += '</div>';
            });
            metaHtml += '</div></div>';
            metaHtml += '<p style="color:#999;font-size:0.8rem;margin-top:12px;font-style:italic">Detailed timeseries decomposition charts are available for districts with sufficient data coverage.</p>';
        } else {
            metaHtml = '<p style="color:#999;font-style:italic">No data available for this district.</p>';
        }
        document.getElementById('deepdive-meta').innerHTML = metaHtml;
        document.getElementById('section-deepdive').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    var years = ts.years || [];
    var chartOpts = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'bottom',
                labels: { font: { size: 10 }, usePointStyle: true, boxWidth: 8 }
            }
        },
        scales: {
            x: { ticks: { maxRotation: 45, font: { size: 9 } }, grid: { display: false } },
            y: { grid: { color: '#eee' }, ticks: { font: { size: 10 } } }
        }
    };

    // Temperature chart
    if (activeDistrictCharts.temp) activeDistrictCharts.temp.destroy();
    var ctxT = document.getElementById('chart-district-temp');
    if (ctxT && ts.kharif_temp_trend) {
        activeDistrictCharts.temp = new Chart(ctxT, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Trend',
                        data: ts.kharif_temp_trend,
                        borderColor: '#e53935',
                        backgroundColor: 'rgba(229,57,53,0.1)',
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.3
                    },
                    {
                        label: 'Covariate',
                        data: ts.kharif_temp_covariate,
                        borderColor: '#ff9800',
                        borderWidth: 1.5,
                        pointRadius: 2,
                        tension: 0
                    },
                    {
                        label: 'Idiosyncratic',
                        data: ts.kharif_temp_idiosyncratic,
                        borderColor: '#9e9e9e',
                        borderWidth: 1,
                        pointRadius: 1,
                        tension: 0
                    }
                ]
            },
            options: Object.assign({}, chartOpts, {
                scales: Object.assign({}, chartOpts.scales, {
                    y: Object.assign({}, chartOpts.scales.y, {
                        title: { display: true, text: 'Temperature (\u00B0C)', font: { size: 11 } }
                    })
                })
            })
        });
    }

    // Precipitation chart
    if (activeDistrictCharts.precip) activeDistrictCharts.precip.destroy();
    var ctxP = document.getElementById('chart-district-precip');
    if (ctxP && ts.kharif_precip_trend) {
        activeDistrictCharts.precip = new Chart(ctxP, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Trend',
                        data: ts.kharif_precip_trend,
                        borderColor: '#1976d2',
                        backgroundColor: 'rgba(25,118,210,0.1)',
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.3
                    },
                    {
                        label: 'Covariate',
                        data: ts.kharif_precip_covariate,
                        borderColor: '#7b1fa2',
                        borderWidth: 1.5,
                        pointRadius: 2,
                        tension: 0
                    },
                    {
                        label: 'Idiosyncratic',
                        data: ts.kharif_precip_idiosyncratic,
                        borderColor: '#9e9e9e',
                        borderWidth: 1,
                        pointRadius: 1,
                        tension: 0
                    }
                ]
            },
            options: Object.assign({}, chartOpts, {
                scales: Object.assign({}, chartOpts.scales, {
                    y: Object.assign({}, chartOpts.scales.y, {
                        title: { display: true, text: 'Precipitation (mm)', font: { size: 11 } }
                    })
                })
            })
        });
    }

    // Crop meta info
    var metaHtml = '';
    if (ts.crops && typeof ts.crops === 'object') {
        var cropNames = Object.keys(ts.crops);
        if (cropNames.length > 0) {
            metaHtml += '<div class="deepdive-stats"><h4>Crops Grown</h4><div class="crop-tags">';
            cropNames.slice(0, 8).forEach(function(name) {
                var crop = ts.crops[name];
                var yields = crop.yield || [];
                var avgYield = yields.length > 0 ?
                    (yields.reduce(function(a, b) { return a + b; }, 0) / yields.length).toFixed(2) : '?';
                metaHtml += '<span class="crop-tag">' + name + ' <small>(avg: ' + avgYield + ' t/ha)</small></span>';
            });
            metaHtml += '</div></div>';
        }
    }
    document.getElementById('deepdive-meta').innerHTML = metaHtml;

    document.getElementById('section-deepdive').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Pre-load Parbhani decomposition ─────────────────────────────────────

function preloadParbhani() {
    // Try parbhani_decomposition.json first, then fall back to timeseriesData
    if (parbhaniDecomposition && parbhaniDecomposition.years) {
        // Inject into timeseriesData so showDistrictDeepDive can find it
        if (!timeseriesData['Parbhani']) {
            timeseriesData['Parbhani'] = parbhaniDecomposition;
        }
    }

    // Set up Parbhani to render when deep dive scrolls into view
    var deepdiveSection = document.getElementById('section-deepdive');
    if (deepdiveSection && (timeseriesData['Parbhani'] || (climateGeo && climateGeo.features))) {
        // Set the header immediately
        document.getElementById('deepdive-district').textContent = 'Parbhani';
        document.getElementById('deepdive-state').textContent = 'Maharashtra';
        var headerEl = document.querySelector('#section-deepdive .section-header h2');
        if (headerEl) headerEl.textContent = 'Decomposition in Action: Parbhani, Maharashtra';

        // Render charts when section scrolls into view
        var deepdiveObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && !initializedMaps._deepdive_rendered) {
                    initializedMaps._deepdive_rendered = true;
                    // Use requestAnimationFrame to ensure container has dimensions
                    requestAnimationFrame(function() {
                        showDistrictDeepDiveCharts('Parbhani', 'MAHARASHTRA');
                    });
                    deepdiveObserver.disconnect();
                }
            });
        }, { rootMargin: '100px 0px', threshold: 0.01 });
        deepdiveObserver.observe(deepdiveSection);
    }
}

// Separated chart rendering from scrolling for preload use
function showDistrictDeepDiveCharts(districtName, stateName) {
    var ts = timeseriesData[districtName];
    var districtProps = null;
    if (climateGeo && climateGeo.features) {
        var match = climateGeo.features.find(function(f) { return f.properties.district === districtName; });
        if (match) districtProps = match.properties;
    }

    if (!ts) {
        // Show stats grid only
        if (districtProps) {
            var metaHtml = '<div class="deepdive-stats"><h4>Climate Summary (1997-2020)</h4>';
            metaHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">';
            [['Warming rate', districtProps.temp_trend_c_decade, '\u00B0C/decade'],
             ['Rainfall change', districtProps.precip_trend_mm_decade, ' mm/decade'],
             ['Monsoon avg temp', districtProps.kharif_mean_temp, '\u00B0C'],
             ['Monsoon avg rain', districtProps.kharif_mean_precip, ' mm']
            ].forEach(function(item) {
                var val = item[1] != null ? Number(item[1]).toFixed(2) : 'N/A';
                metaHtml += '<div style="background:#f9fafb;padding:10px 14px;border-radius:8px">';
                metaHtml += '<div style="font-size:0.7rem;color:#888;text-transform:uppercase;letter-spacing:0.5px">' + item[0] + '</div>';
                metaHtml += '<div style="font-size:1.1rem;font-weight:700">' + val + item[2] + '</div></div>';
            });
            metaHtml += '</div></div>';
            document.getElementById('deepdive-meta').innerHTML = metaHtml;
        }
        return;
    }

    // Render the actual charts
    var years = ts.years || [];
    var chartOpts = {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, usePointStyle: true, boxWidth: 8 } } },
        scales: { x: { ticks: { maxRotation: 45, font: { size: 9 } }, grid: { display: false } }, y: { grid: { color: '#eee' }, ticks: { font: { size: 10 } } } }
    };

    if (activeDistrictCharts.temp) activeDistrictCharts.temp.destroy();
    var ctxT = document.getElementById('chart-district-temp');
    if (ctxT && ts.kharif_temp_trend) {
        activeDistrictCharts.temp = new Chart(ctxT, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    { label: 'Trend', data: ts.kharif_temp_trend, borderColor: '#e53935', backgroundColor: 'rgba(229,57,53,0.1)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.3 },
                    { label: 'Covariate', data: ts.kharif_temp_covariate, borderColor: '#ff9800', borderWidth: 1.5, pointRadius: 2, tension: 0 },
                    { label: 'Idiosyncratic', data: ts.kharif_temp_idiosyncratic, borderColor: '#9e9e9e', borderWidth: 1, pointRadius: 1, tension: 0 }
                ]
            },
            options: Object.assign({}, chartOpts, { scales: Object.assign({}, chartOpts.scales, { y: Object.assign({}, chartOpts.scales.y, { title: { display: true, text: 'Temperature (\u00B0C)', font: { size: 11 } } }) }) })
        });
    }

    if (activeDistrictCharts.precip) activeDistrictCharts.precip.destroy();
    var ctxP = document.getElementById('chart-district-precip');
    if (ctxP && ts.kharif_precip_trend) {
        activeDistrictCharts.precip = new Chart(ctxP, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    { label: 'Trend', data: ts.kharif_precip_trend, borderColor: '#1976d2', backgroundColor: 'rgba(25,118,210,0.1)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.3 },
                    { label: 'Covariate', data: ts.kharif_precip_covariate, borderColor: '#7b1fa2', borderWidth: 1.5, pointRadius: 2, tension: 0 },
                    { label: 'Idiosyncratic', data: ts.kharif_precip_idiosyncratic, borderColor: '#9e9e9e', borderWidth: 1, pointRadius: 1, tension: 0 }
                ]
            },
            options: Object.assign({}, chartOpts, { scales: Object.assign({}, chartOpts.scales, { y: Object.assign({}, chartOpts.scales.y, { title: { display: true, text: 'Precipitation (mm)', font: { size: 11 } } }) }) })
        });
    }

    // Crop info
    var metaHtml = '';
    if (ts.crops && typeof ts.crops === 'object') {
        var cropNames = Object.keys(ts.crops);
        if (cropNames.length > 0) {
            metaHtml += '<div class="deepdive-stats"><h4>Crops Grown</h4><div class="crop-tags">';
            cropNames.slice(0, 8).forEach(function(name) {
                var crop = ts.crops[name];
                var yields = crop.yield || [];
                var avgYield = yields.length > 0 ? (yields.reduce(function(a,b){return a+b;},0)/yields.length).toFixed(2) : '?';
                metaHtml += '<span class="crop-tag">' + name + ' <small>(avg: ' + avgYield + ' t/ha)</small></span>';
            });
            metaHtml += '</div></div>';
        }
    }
    document.getElementById('deepdive-meta').innerHTML = metaHtml;
}

// ── District search ─────────────────────────────────────────────────────

function initSearch() {
    var input = document.getElementById('district-search');
    var results = document.getElementById('search-results');
    if (!input || !results) return;

    input.addEventListener('input', function() {
        var q = input.value.toLowerCase().trim();
        if (q.length < 2) {
            results.innerHTML = '';
            results.style.display = 'none';
            return;
        }

        var matches = allDistricts.filter(function(d) {
            return d.name.toLowerCase().indexOf(q) !== -1;
        }).slice(0, 10);

        if (matches.length === 0) {
            results.innerHTML = '<div class="search-item">No matches</div>';
            results.style.display = 'block';
            return;
        }

        results.innerHTML = matches.map(function(d) {
            return '<div class="search-item" data-district="' + d.name + '" data-state="' + d.state + '">' +
                   d.name + ' <small>' + d.state + '</small></div>';
        }).join('');
        results.style.display = 'block';

        results.querySelectorAll('.search-item[data-district]').forEach(function(el) {
            el.addEventListener('click', function() {
                showDistrictDeepDive(el.dataset.district, el.dataset.state);
                input.value = el.dataset.district;
                results.style.display = 'none';
            });
        });
    });

    input.addEventListener('blur', function() {
        setTimeout(function() { results.style.display = 'none'; }, 200);
    });

    input.addEventListener('focus', function() {
        if (input.value.length >= 2) {
            input.dispatchEvent(new Event('input'));
        }
    });
}

// ── Data loading ────────────────────────────────────────────────────────

function load(path) {
    return fetch(path)
        .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .catch(function(e) {
            console.warn('Load ' + path + ':', e);
            return null;
        });
}

// ── Main init ───────────────────────────────────────────────────────────

function init() {
    Promise.all([
        load('data/districts_climate.geojson'),       // 0
        load('data/pilot_districts.geojson'),          // 1
        load('data/summary_stats.json'),               // 2
        load('data/district_timeseries.json'),         // 3
        load('data/projected_2035.json'),              // 4
        load('data/vulnerability_scatter.json'),       // 5
        load('data/crop_coefficients.json'),           // 6
        load('data/covariate_timeline.json'),          // 7
        load('data/parbhani_decomposition.json'),      // 8
        load('data/shock_response_coefficients.json')  // 9
    ]).then(function(results) {
        climateGeo = results[0];
        pilotGeo = results[1];
        summaryData = results[2];
        if (results[3]) timeseriesData = results[3];
        projectedData = results[4];
        vulnerabilityData = results[5];
        cropCoefficients = results[6];
        covariateTimeline = results[7];
        parbhaniDecomposition = results[8];
        shockCoefficients = results[9];

        // Build district list for search (combine both GeoJSON sources)
        var seen = {};
        if (climateGeo && climateGeo.features) {
            climateGeo.features.forEach(function(f) {
                var name = f.properties.district;
                if (name && !seen[name]) {
                    allDistricts.push({ name: name, state: f.properties.state || '' });
                    seen[name] = true;
                }
            });
        }
        if (pilotGeo && pilotGeo.features) {
            pilotGeo.features.forEach(function(f) {
                var name = f.properties.district;
                if (name && !seen[name]) {
                    allDistricts.push({ name: name, state: f.properties.state || '' });
                    seen[name] = true;
                }
            });
        }
        allDistricts.sort(function(a, b) { return a.name.localeCompare(b.name); });

        initSearch();

        // Update summary stats in hero
        if (summaryData) {
            var el = document.getElementById('stat-warming');
            if (el) el.innerHTML = (summaryData.avg_warming_rate_c_decade || 0.13).toFixed(2) + '&deg;C';
            var wp = document.getElementById('warming-pct');
            if (wp) wp.textContent = (summaryData.pct_districts_warming || 94.6).toFixed(1) + '%';
            var sd = document.getElementById('stat-districts');
            if (sd) sd.textContent = summaryData.total_districts_climate || 725;
        }

        // Set up lazy map loading via IntersectionObserver
        setupMapObservers();

        // Pre-load Parbhani deep dive
        setTimeout(function() {
            preloadParbhani();
        }, 500);
    });
}

document.addEventListener('DOMContentLoaded', init);
