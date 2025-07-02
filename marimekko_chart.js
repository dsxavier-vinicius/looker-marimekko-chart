// Import D3 properly via script injection
let d3ScriptLoaded = false;

function loadD3(callback) {
  if (d3ScriptLoaded || typeof d3 !== 'undefined') {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://d3js.org/d3.v7.min.js';
  script.onload = () => {
    d3ScriptLoaded = true;
    callback();
  };
  script.onerror = () => console.error("Erro ao carregar D3");
  document.head.appendChild(script);
}

looker.plugins.visualizations.add({
  id: "marimekko_chart",
  label: "Marimekko Chart (Variable Width)",
  options: {
    barColor: {
      type: "string",
      label: "Bar Color",
      display: "color",
      default: "#4682b4"
    },
    barPadding: {
      type: "number",
      label: "Bar Padding (px)",
      default: 1
    },
    labelColor: {
      type: "string",
      label: "Label Color",
      display: "color",
      default: "#000000"
    },
    labelFontSize: {
      type: "number",
      label: "Label Font Size",
      default: 12
    },
    showLabels: {
      type: "boolean",
      label: "Show Labels",
      default: true
    },
    showXAxis: {
      type: "boolean",
      label: "Show X Axis",
      default: true
    },
    showYAxis: {
      type: "boolean",
      label: "Show Y Axis",
      default: true
    },
    maxRows: {
      type: "number",
      label: "Max Rows to Display",
      default: 30
    },
    xAxisLabelRotation: {
      type: "number",
      label: "X Axis Label Rotation (degrees)",
      default: 0
    }
  },

  create: function(element, config) {
    element.innerHTML = "<div id='marimekko'></div>";
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    if (!data || data.length === 0) {
      element.innerHTML = "<p>No data</p>";
      done();
      return;
    }

    loadD3(() => {
      element.innerHTML = "";
      const svg = d3.select(element).append("svg")
        .attr("width", element.offsetWidth)
        .attr("height", element.offsetHeight);

      const width = element.offsetWidth;
      const height = element.offsetHeight;

      const dimensions = queryResponse.fields.dimension_like;
      const measures = queryResponse.fields.measure_like;

      if (dimensions.length < 2 || measures.length < 1) {
        element.innerHTML = "<p>Use at least 2 dimensions and 1 measure</p>";
        done();
        return;
      }

      const groupKey = dimensions[0].name;
      const stackKey = dimensions[1].name;
      const valueKey = measures[0].name;

      const nested = d3.rollup(
        data,
        v => v.map(d => ({
          group: d[groupKey].value,
          stack: d[stackKey].value,
          value: +d[valueKey].value
        })),
        d => d[groupKey].value
      );

      const processed = [];
      for (const [group, records] of nested) {
        const total = d3.sum(records, d => d.value);
        let cumulative = 0;
        for (const r of records) {
          processed.push({
            group: group,
            stack: r.stack,
            value: r.value,
            total: total,
            cumulative: cumulative
          });
          cumulative += r.value;
        }
      }

      const groupedTotals = Array.from(d3.rollup(processed, v => d3.sum(v, d => d.value), d => d.group), ([group, total]) => ({ group, total }));
      const totalAll = d3.sum(groupedTotals, d => d.total);

      const groupWidths = new Map();
      let cumulativeWidth = 0;
      for (const d of groupedTotals) {
        const w = d.total / totalAll;
        groupWidths.set(d.group, w);
      }

      const x = d3.scaleLinear().range([0, width]);
      const y = d3.scaleLinear().range([height, 0]);

      const maxValue = d3.max(processed, d => d.total);
      y.domain([0, maxValue]);

      const xStart = new Map();
      let currentX = 0;
      for (const d of groupedTotals) {
        xStart.set(d.group, currentX);
        currentX += groupWidths.get(d.group);
      }

      const barPadding = config.barPadding || 0;
      const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

      svg.selectAll(".bar")
        .data(processed)
        .enter()
        .append("rect")
        .attr("x", d => x(xStart.get(d.group)))
        .attr("y", d => y(d.cumulative + d.value))
        .attr("height", d => y(d.cumulative) - y(d.cumulative + d.value))
        .attr("width", d => x(groupWidths.get(d.group)) - barPadding)
        .attr("fill", config.barColor || colorScale(d.stack));

      if (config.showLabels) {
        svg.selectAll(".label")
          .data(processed)
          .enter()
          .append("text")
          .text(d => d.stack)
          .attr("x", d => x(xStart.get(d.group)) + 4)
          .attr("y", d => y(d.cumulative + d.value / 2))
          .attr("fill", config.labelColor || "#000")
          .style("font-size", config.labelFontSize + "px");
      }

      if (config.showXAxis) {
        const xAxisScale = d3.scalePoint()
          .domain(groupedTotals.map(d => d.group))
          .range([0, width]);

        const xAxis = d3.axisBottom(xAxisScale);

        svg.append("g")
          .attr("transform", `translate(0, ${height})`)
          .call(xAxis)
          .selectAll("text")
          .attr("text-anchor", "end")
          .attr("transform", `rotate(${config.xAxisLabelRotation || 0})`);
      }

      if (config.showYAxis) {
        const yAxis = d3.axisLeft(y);
        svg.append("g")
          .attr("transform", `translate(0,0)`)
          .call(yAxis);
      }

      done();
    });
  }
});
