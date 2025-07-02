/**
 * Visualização: Gráfico de Barras de Largura Variável (Variable Width Bar Chart)
 *
 * ESTRUTURA DE DADOS:
 * 1. Dimensão: As categorias para o eixo X (ex: Cliente).
 * 2. Medida 1: O valor para a altura de cada barra (Eixo Y).
 * 3. Medida 2: O valor para a largura de cada barra.
 */
looker.plugins.visualizations.add({
  id: 'variable_width_bar_chart',
  label: 'Variable Width Bar Chart',

  _d3_ready: false,
  _elements_ready: false,

  options: {
    color_bar: {
        type: 'string', display: 'color', label: 'Bar Color', section: 'Colors',
        default: '#4285F4'
    },
    show_y_axis: {
      type: 'boolean', label: 'Show Y-Axis', section: 'Axes', default: true, order: 1
    },
    y_axis_format: {
        type: 'string', label: 'Y-Axis Value Format', section: 'Axes', placeholder: 'e.g., "#,##0.0"',
        default: '', order: 2
    },
    show_labels: {
      type: 'boolean', label: 'Show Bar Labels', section: 'Labels', default: false, order: 1
    },
    label_font_size: {
      type: 'number', label: 'Label Font Size', section: 'Labels', default: 11, order: 2
    },
    label_font_color: {
      type: 'string', label: 'Label Color', section: 'Labels', display: 'color', default: '#ffffff', order: 3
    }
  },

  create: function (element, config) {
    const d3_version = '7';
    if (typeof d3 === 'undefined') {
      const script = document.createElement('script');
      script.src = `https://d3js.org/d3.v${d3_version}.min.js`;
      script.async = true;
      script.onload = () => { this._d3_ready = true; };
      document.head.appendChild(script);
    } else {
      this._d3_ready = true;
    }

    element.innerHTML = `
      <style>
        .variable-width-chart { font-family: "Google Sans", "Noto Sans", sans-serif; }
        .bar-rect:hover { opacity: 0.8; cursor: pointer; }
        .chart-axis path, .chart-axis line { fill: none; stroke: #A9A9A9; shape-rendering: crispEdges; }
        .chart-axis text, .x-axis-label { fill: #333; font-size: 11px; }
        .bar-label { pointer-events: none; text-anchor: middle; fill: white; }
      </style>
      <div class="variable-width-chart">
        <svg class="chart-svg"></svg>
      </div>
    `;
  },

  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    if (!this._d3_ready) {
      setTimeout(() => this.updateAsync(data, element, config, queryResponse, details, doneRendering), 100);
      return;
    }

    if (!this._elements_ready) {
      this._svg = d3.select(element).select('.chart-svg');
      this._tooltip = d3.select(element).append('div').attr('class', 'looker-tooltip').style('display', 'none').style('position', 'absolute').style('pointer-events', 'none').style('z-index', 100);
      this._elements_ready = true;
    }

    this.clearErrors();

    if (data.length === 0) { doneRendering(); return; }
    
    const dims = queryResponse.fields.dimension_like;
    const meas = queryResponse.fields.measure_like;

    if (dims.length < 1 || meas.length < 2) {
      this.addError({
        title: 'Estrutura de Campos Inválida',
        message: 'Esta visualização requer 1 Dimensão e 2 Medidas.'
      });
      return;
    }

    const xDimension = dims[0];
    const yMeasure = meas[0];     // Altura
    const widthMeasure = meas[1]; // Largura

    // --- Processamento de Dados (lógica simplificada) ---
    let cumulativeWidth = 0;
    const processedData = data.map(row => {
        const heightValue = row[yMeasure.name]?.value;
        const widthValue = row[widthMeasure.name]?.value;

        const item = {
            xCategory: row[xDimension.name].value,
            yValue: heightValue,
            widthValue: widthValue,
            xStart: cumulativeWidth,
            // Guardar células para tooltips e drill-down
            _cells: {
                x: row[xDimension.name],
                y: row[yMeasure.name],
                width: row[widthMeasure.name]
            }
        };
        cumulativeWidth += widthValue;
        return item;
    });

    const totalWidth = cumulativeWidth;
    const yMax = d3.max(processedData, d => d.yValue);

    // --- Renderização ---
    const svgEl = this._svg.node();
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = svgEl.clientWidth - margin.left - margin.right;
    const height = svgEl.clientHeight - margin.top - margin.bottom;

    this._svg.selectAll('*').remove();
    this._svg.attr('width', '100%').attr('height', '100%');
    const g = this._svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Escalas
    const xScale = d3.scaleLinear().domain([0, totalWidth]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]).nice();
    
    // Eixo Y
    if (config.show_y_axis) {
        const yAxisGenerator = d3.axisLeft(yScale);
        if (config.y_axis_format) {
            yAxisGenerator.tickFormat(d3.format(config.y_axis_format));
        }
        g.append('g').attr('class', 'chart-axis').call(yAxisGenerator);
    }
    
    // Eixo X (rótulos manuais)
    const xAxisGroup = g.append("g")
      .attr("transform", `translate(0,${height})`)
      .attr("class", "chart-axis");
    
    processedData.forEach(d => {
        const barCenter = xScale(d.xStart + d.widthValue / 2);
        xAxisGroup.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', barCenter)
            .attr('y', margin.bottom - 10)
            .attr('text-anchor', 'middle')
            .text(d.xCategory)
            .each(function() { // Truncate text if it's too long for the bar
                const barWidth = xScale(d.widthValue);
                if (this.getBBox().width > barWidth) {
                    d3.select(this).text(d.xCategory.substring(0, 5) + '...');
                }
            });
    });

    // Barras
    g.selectAll('.bar-rect')
      .data(processedData)
      .join('rect')
        .attr('class', 'bar-rect')
        .attr('x', d => xScale(d.xStart))
        .attr('y', d => yScale(d.yValue))
        .attr('width', d => xScale(d.widthValue))
        .attr('height', d => height - yScale(d.yValue))
        .attr('fill', config.color_bar)
        .on('mouseover', (event, d) => {
            this._tooltip.style('display', 'block')
              .html(`
                <strong>${LookerCharts.Utils.textForCell(d._cells.x)}</strong><br>
                ${yMeasure.label_short || yMeasure.label}: ${LookerCharts.Utils.textForCell(d._cells.y)}<br>
                ${widthMeasure.label_short || widthMeasure.label}: ${LookerCharts.Utils.textForCell(d._cells.width)}
              `);
        })
        .on('mousemove', (event) => {
            this._tooltip
                .style('top', (event.pageY + 15) + 'px')
                .style('left', (event.pageX + 15) + 'px');
        })
        .on('mouseout', () => {
            this._tooltip.style('display', 'none');
        })
        .on('click', (event, d) => {
            LookerCharts.Utils.openDrillMenu({
                links: d._cells.x.links, // Drill a partir da dimensão
                event: event
            });
        });

    // Labels nas Barras
    if (config.show_labels) {
        g.selectAll('.bar-label')
            .data(processedData)
            .join('text')
                .attr('class', 'bar-label')
                .attr('x', d => xScale(d.xStart + d.widthValue / 2))
                .attr('y', d => yScale(d.yValue) + config.label_font_size * 1.5)
                .style('fill', config.label_font_color)
                .style('font-size', `${config.label_font_size}px`)
                .text(d => LookerCharts.Utils.textForCell(d._cells.y)); // Mostra o valor da altura
    }

    doneRendering();
  }
});
