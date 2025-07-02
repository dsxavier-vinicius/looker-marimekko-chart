// Marimekko Chart (Variable Width)
// Versão final corrigida com suporte a D3, controle total da interface e erros resolvidos

function loadScript(url) {
  return new Promise(function(resolve, reject) {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

looker.plugins.visualizations.add({
  id: "marimekko_variable_width",
  label: "Marimekko Chart (Variable Width)",

  options: {
    bar_color: {
      type: "string",
      label: "Bar Color",
      display: "color",
      default: "#4682b4"
    },
    bar_padding: {
      type: "number",
      label: "Bar Padding (px)",
      default: 1
    },
    label_font_size: {
      type: "number",
      label: "Label Font Size",
      default: 12
    },
    label_color: {
      type: "string",
      label: "Label Color",
      display: "color",
      default: "#ffffff"
    },
    show_labels: {
      type: "boolean",
      label: "Show Labels",
      default: true
    },
    show_x_axis: {
      type: "boolean",
      label: "Show X Axis",
      default: true
    },
    show_y_axis: {
      type: "boolean",
      label: "Show Y Axis",
      default: true
    },
    x_label_rotation: {
      type: "number",
      label: "X Axis Label Rotation (degrees)",
      default: 0
    },
    max_rows: {
      type: "number",
      label: "Max Rows to Display",
      default: 30
    }
  },

  create: function(element, config) {
    element.innerHTML = "";
    this.container = element.appendChild(document.createElement("div"));
    this.container.style.width = "100%";
    this.container.style.height = "100%";
  },

  updateAsync: function(data, element, config, queryResponse, details, doneRendering) {
    loadScript("https://d3js.org/d3.v7.min.js")
      .then(() => {
        const d3 = window.d3;
        this.container.innerHTML = "";

        const width = element.clientWidth;
        const height = element.clientHeight;

        const svg = d3.select(this.container)
          .append("svg")
          .attr("width", width)
          .attr("height", height);

        const dimension = queryResponse.fields.dimension_like[0];
        const measure = queryResponse.fields.measure_like[0];

        const prepared = data.slice(0, config.max_rows).map(d => {
          return {
            label: d[dimension.name].value,
            value: +d[measure.name].value
          }
        });

        const total = d3.sum(prepared, d => d.value);
        let cumWidth = 0;
        const barPadding = config.bar_padding;

        const y = d3.scaleLinear()
          .domain([0, d3.max(prepared, d => d.value)])
          .range([height - 40, 20]);

        const g = svg.append("g");

        const xLabels = [];

        prepared.forEach((d, i) => {
          const w = (d.value / total) * width;

          if (!isFinite(w) || w <= 0) return;

          g.append("rect")
            .attr("x", cumWidth + barPadding)
            .attr("y", y(d.value))
            .attr("width", w - barPadding * 2)
            .attr("height", height - 40 - y(d.value))
            .attr("fill", config.bar_color);

          if (config.show_labels) {
            g.append("text")
              .attr("x", cumWidth + w / 2)
              .attr("y", y(d.value) + 15)
              .attr("text-anchor", "middle")
              .style("fill", config.label_color)
              .style("font-size", `${config.label_font_size}px`)
              .text(d.label);
          }

          xLabels.push({
            label: d.label,
            x: cumWidth + w / 2
          });

          cumWidth += w;
        });

        if (config.show_x_axis) {
          svg.append("g")
            .attr("transform", `translate(0,${height - 20})`)
            .call(g => {
              g.selectAll("text")
                .data(xLabels)
                .join("text")
                .attr("x", d => d.x)
                .attr("y", 0)
                .attr("transform", d => `rotate(${config.x_label_rotation},${d.x},0)`)
                .attr("text-anchor", "middle")
                .style("font-size", `${config.label_font_size}px`)
                .text(d => d.label);
            });
        }

        if (config.show_y_axis) {
          const axisY = d3.axisLeft(y).ticks(5);
          svg.append("g")
            .attr("transform", `translate(0,0)`)
            .call(axisY);
        }

        doneRendering();
      })
      .catch(err => {
        console.error("Erro ao carregar D3:", err);
        doneRendering();
      });
  }
});
