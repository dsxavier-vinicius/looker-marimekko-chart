/**
 * Visualização Marimekko para Looker
 *
 * ESTRUTURA DE DADOS CRÍTICA:
 * A ordem dos campos na consulta do Looker DEVE ser a seguinte:
 * 1. Dimensão de Empilhamento (Stacking Dimension): As categorias a serem empilhadas (ex: Categoria de Produto).
 * 2. Dimensão de Rótulo do Eixo X (X-Axis Label Dimension - Opcional): Usada para os nomes das colunas (ex: País).
 * 3. Medida de Altura (Height Measure): O valor para a altura de cada segmento (ex: Vendas).
 * 4. Medida de Largura (Width Measure): O valor para a largura total da coluna (ex: Total de Vendas por País).
 */
looker.plugins.visualizations.add({
  id: 'marimekko_premium_1d_2m_final',
  label: 'Marimekko Chart (Final)',

  _d3_ready: false,
  _elements_ready: false,

  options: {
    color_range: {
      type: 'array', label: 'Color Palette', section: 'Colors', display: 'colors',
      default: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043', '#9E9D24']
    },
    show_y_axis: {
      type: 'boolean', label: 'Show Y-Axis', section: 'Axes', default: true, order: 1
    },
    y_axis_format: {
        type: 'string', label: 'Y-Axis Value Format', section: 'Axes', placeholder: 'e.g., "0.0%" or "#,##0"',
        default: '0.0%', order: 2
    },
    show_labels: {
      type: 'boolean', label: 'Show Segment Labels', section: 'Labels', default: true, order: 1
    },
    label_format: {
      type: 'string', label: 'Label Value Format', section: 'Labels', placeholder: 'e.g., "#,##0.00"',
      default: '', order: 2
    },
    label_font_size: {
      type: 'number', label: 'Label Font Size', section: 'Labels', default: 12, order: 3
    },
    label_font_color: {
      type: 'string', label: 'Label Color', section: 'Labels', display: 'color', default: '#ffffff', order: 4
    },
    show_legend: {
        type: 'boolean', label: 'Show Legend', section: 'Legend', default: true, order: 1
    },
    legend_position: {
        type: 'string', label: 'Legend Position', section: 'Legend', display: 'radio',
        values: [{'Right': 'right'}, {'Bottom': 'bottom'}], default: 'right', order: 2
    }
  },

  create: function (element, config) {
    // A função 'create' agora só carrega o D3 e cria o HTML/CSS. NENHUMA chamada a d3() aqui.
    const d3_version = '7';
    if (typeof d3 === 'undefined') {
      const script = document.createElement('script');
      script.src = `https://d3js.org/d3.v${d3_version}.min.js`;
      script.async = true;
      script.onload = () => {
        this._d3_ready = true;
      };
      document.head.appendChild(script);
    } else {
      this._d3_ready = true;
    }

    element.innerHTML = `
      <style>
        .marimekko-container { display: flex; flex-direction: column; width: 100%; height: 100%; font-family: "Google Sans", "Noto Sans", "Noto Sans JP", "Noto Sans CJK KR", "Noto Sans Arabic UI", "Noto Sans Devanagari UI", "Noto Sans Hebrew UI", "Noto Sans Thai UI", Helvetica, Arial, sans-serif; }
        .marimekko-svg { flex-grow: 1; }
        .marimekko-legend { flex-shrink: 0; padding: 10px; overflow-y: auto; }
        .marimekko-legend-item { display: flex; align-items: center; margin-bottom: 5px; font-size: 12px; }
        .marimekko-legend-color { width: 12px; height: 12px; margin-right: 8px; border-radius: 2px; flex-shrink: 0; }
        .marimekko-rect { transition: opacity 0.2s; }
        .marimekko-rect:hover { opacity: 0.85; cursor: pointer; }
        .marimekko-axis path, .marimekko-axis line { fill: none; stroke: #A9A9A9; shape-rendering: crispEdges; }
        .marimekko-axis text, .x-axis-label { fill: #333; font-size: 11px; }
        .marimekko-label { pointer-events: none; text-anchor: middle; }
      </style>
      <div class="marimekko-container">
        <svg class="marimekko-svg"></svg>
        <div class="marimekko-legend"></div>
      </div>
    `;
  },

  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    // 1. Esperar pelo D3
    if (!this._d3_ready) {
      setTimeout(() => this.updateAsync(data, element, config, queryResponse, details, doneRendering), 100);
      return;
    }

    // 2. Inicializar elementos dependentes do D3 (apenas uma vez)
    if (!this._elements_ready) {
      this._svg = d3.select(element).select('.marimekko-svg');
      this._container = d3.select(element).select('.marimekko-container');
      this._legend = this._container.select('.marimekko-legend');
      this._tooltip = d3.select(element).append('div').attr('class', 'looker-tooltip').style('display', 'none').style('position', 'absolute').style('pointer-events', 'none').style('z-index', 100);
      this._elements_ready = true;
    }

    this.clearErrors();

    // 3. Validação robusta de dados e campos
    if (data.length === 0) {
        doneRendering();
        return;
    }
    
    const dims = queryResponse.fields.dimension_like;
    const meas = queryResponse.fields.measure_like;

    if (dims.length < 1 || meas.length < 2) {
      this.addError({
        title: 'Estrutura de Campos Inválida',
        message: 'Esta visualização requer 1 Dimensão e 2 Medidas. Verifique a ordem dos campos na sua consulta.'
      });
      return;
    }

    const stackDimension = dims[0];
    const heightMeasure = meas[0];
    const widthMeasure = meas[1];
    const firstRow = data[0];

    if (!firstRow[stackDimension.name] || !firstRow[heightMeasure.name] || !firstRow[widthMeasure.name]) {
        this.addError({
            title: "Nomes de Campos Não Encontrados",
            message: `O código não encontrou os campos esperados nos dados. Verifique se a ordem da sua consulta está correta: 1º Dimensão (Stack), 2º Medida (Altura), 3º Medida (Largura).`
        });
        return;
    }

    // 4. Lógica de processamento e desenho (agora mais segura)
    const hasXAxisDimension = dims.length > 1;
    const xAxisLabelDimensionName = hasXAxisDimension ? dims[1].name : null;

    const dataByColumn = d3.group(data, d => d[widthMeasure.name]?.value);
    
    const stackKeys = Array.from(new Set(data.map(d => d[stackDimension.name].value))).sort();

    const stackedDataInput = Array.from(dataByColumn.entries()).map(([widthValue, rows]) => {
      const entry = {
        total: widthValue, 
        xCategory: xAxisLabelDimensionName ? rows[0][xAxisLabelDimensionName]?.value : widthValue?.toLocaleString()
      };
      stackKeys.forEach(stackKey => {
        const foundRow = rows.find(r => r[stackDimension.name].value === stackKey);
        entry[stackKey] = foundRow ? foundRow[heightMeasure.name].value : 0;
        if (foundRow) {
            entry[`_cell_${stackKey}`] = foundRow[heightMeasure.name];
        }
      });
      return entry;
    });

    const stack = d3.stack().keys(stackKeys);
    const stackedSeries = stack(stackedDataInput);

    const totalValue = d3.sum(Array.from(dataByColumn.keys()));
    const yMax = d3.max(Array.from(dataByColumn.keys()));

    if (!totalValue || totalValue === 0) {
      // Não é um erro, pode ser um resultado de filtro. Apenas limpa o gráfico.
      this._svg.selectAll('*').remove();
      this._legend.html('');
      doneRendering();
      return;
    }

    this._container.style('flex-direction', config.legend_position === 'right' ? 'row' : 'column');
    this._legend.style('display', config.show_legend ? 'block' : 'none');
    
    const svgEl = this._svg.node();
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = svgEl.clientWidth - margin.left - margin.right;
    const height = svgEl.clientHeight - margin.top - margin.bottom;

    this._svg.selectAll('*').remove();
    const g = this._svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, totalValue]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]).nice();
    const colorScale = d3.scaleOrdinal().domain(stackKeys).range(config.color_range);

    const xAxisGroup = g.append("g")
      .attr("transform", `translate(0,${height})`)
      .attr("class", "marimekko-axis");

    let cumulativeWidth = 0;
    const xPositions = []; 

    // O resto do código permanece igual
    g.selectAll('.series')
      .data(stackedSeries)
      .join('g')
        .attr('class', 'series')
        .attr('fill', d => colorScale(d.key))
      .selectAll('.marimekko-rect')
      .data(d => d.map(item => { item.key = d.key; return item; }))
      .join('rect')
        .attr('class', 'marimekko-rect')
        .attr('x', d => {
            if (d.data.xStart === undefined) {
                d.data.xStart = cumulativeWidth;
                xPositions.push({ label: d.data.xCategory, pos: cumulativeWidth + d.data.total / 2 });
                cumulativeWidth += d.data.total;
            }
            return xScale(d.data.xStart);
        })
        .attr('y', d => yScale(d[1]))
        .attr('height', d => Math.max(0, yScale(d[0]) - yScale(d[1])))
        .attr('width', d => xScale(d.data.total))
        .on('mouseover', (event, d) => {
            this._tooltip.style('display', 'block');
            const percOfColumn = d.data.total > 0 ? (d[1] - d[0]) / d.data.total : 0;
            const percOfTotal = totalValue > 0 ? (d[1] - d[0]) / totalValue : 0;
            const cell = d.data[`_cell_${d.key}`];
            this._tooltip.html(`
              <strong>${d.key}</strong> (${d.data.xCategory})<br>
              Valor: ${cell ? LookerCharts.Utils.textForCell(cell) : 'N/A'}<br>
              % da Coluna: ${(percOfColumn * 100).toFixed(1)}%<br>
              % do Total: ${(percOfTotal * 100).toFixed(1)}%
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
            const cell = d.data[`_cell_${d.key}`];
            if (cell && cell.links) {
              LookerCharts.Utils.openDrillMenu({
                  links: cell.links,
                  event: event
              });
            }
        });

    xAxisGroup.selectAll('.x-axis-label')
      .data(xPositions)
      .join('text')
      .attr('class', 'x-axis-label')
      .attr('x', d => xScale(d.pos))
      .attr('y', margin.bottom - 10)
      .attr('text-anchor', 'middle')
      .style('fill', '#333')
      .text(d => d.label);
      
    if (config.show_labels) {
        cumulativeWidth = 0; // Reset
        g.selectAll('.label-series')
          .data(stackedSeries)
          .join('g')
          .selectAll('.marimekko-label')
          .data(d => d.map(item => { item.key = d.key; return item; }))
          .join('text')
            .attr('class', 'marimekko-label')
            .attr('fill', config.label_font_color)
            .style('font-size', `${config.label_font_size}px`)
            .text(d => {
                const value = d[1] - d[0];
                if (value === 0) return '';
                const format = config.label_format || LookerCharts.Utils.guessValueFormat(meas[0]);
                const formatter = LookerCharts.Utils.formatString(format);
                return formatter(value);
            })
            .attr('x', d => {
                if (d.data.xStart === undefined) {
                    d.data.xStart = cumulativeWidth;
                    cumulativeWidth += d.data.total;
                }
                return xScale(d.data.xStart + d.data.total / 2);
            })
            .attr('y', d => yScale(d[0]) - ((yScale(d[0]) - yScale(d[1])) / 2) + config.label_font_size / 3)
            .style('display', d => {
                const rectHeight = Math.abs(yScale(d[0]) - yScale(d[1]));
                const rectWidth = Math.abs(xScale(d.data.total));
                const textLength = String(d.key).length;
                const textWidth = textLength * config.label_font_size * 0.6;
                return rectHeight < (config.label_font_size * 1.2) || rectWidth < textWidth ? 'none' : 'block';
            });
    }

    if (config.show_y_axis) {
      const yAxisFormatFunc = (d) => {
        const percentage = yMax > 0 ? d / yMax : 0;
        return d3.format(config.y_axis_format)(percentage);
      };
      const yAxis = d3.axisLeft(yScale).tickFormat(yAxisFormatFunc).ticks(5);
      g.append('g').attr('class', 'marimekko-axis').call(yAxis);
    }
    
    if (config.show_legend) {
        this._legend.html('');
        const legendItems = this._legend.selectAll('.marimekko-legend-item')
            .data(colorScale.domain())
            .join('div')
            .attr('class', 'marimekko-legend-item');

        legendItems.append('div')
            .attr('class', 'marimekko-legend-color')
            .style('background-color', d => colorScale(d));
            
        legendItems.append('span')
            .text(d => d);
    }

    doneRendering();
  }
});
