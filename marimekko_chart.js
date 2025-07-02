// ... (options e create ficam iguais ao código "premium" anterior)

updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
  this.clearErrors();

  // *****************************************************************
  // 1. VALIDAÇÃO DE DADOS ADAPTADA
  // *****************************************************************
  const dims = queryResponse.fields.dimension_like;
  const meas = queryResponse.fields.measure_like;

  if (dims.length < 1 || meas.length < 2) {
    this.addError({
      title: 'Dados Inválidos para Marimekko',
      message: 'Esta visualização requer 1 Dimensão e 2 Medidas.'
    });
    return;
  }
  
  // Para labels do eixo X, podemos usar uma 2ª dimensão se ela existir.
  // Ex: Dim1=Categoria, Dim2=País, Med1=Vendas, Med2=Vendas Totais por País
  const hasXAxisDimension = dims.length > 1;

  // *****************************************************************
  // 2. TRANSFORMAÇÃO DE DADOS (A GRANDE MUDANÇA)
  // *****************************************************************
  const stackDimension = dims[0].name;   // Dimensão para empilhar (ex: Categoria)
  const heightMeasure = meas[0].name;    // Medida para a altura (ex: Vendas)
  const widthMeasure = meas[1].name;     // Medida para a largura (ex: Total Vendas por País)
  const xAxisLabelDimension = hasXAxisDimension ? dims[1].name : null; // Dimensão opcional para os labels do eixo X

  // Agrupar dados pela medida de largura. Cada grupo será uma coluna.
  const dataByColumn = d3.group(data, d => d[widthMeasure.name].value);
  
  // Obter todas as categorias de empilhamento (para o d3.stack e legenda)
  const stackKeys = Array.from(new Set(data.map(d => d[stackDimension].value)));

  // Estruturar os dados para o d3.stack
  const stackedDataInput = Array.from(dataByColumn.entries()).map(([widthValue, rows]) => {
    const entry = {
      // O 'total' da coluna é o próprio valor da medida de largura
      total: widthValue, 
      // Se houver uma 2ª dimensão, usamos o seu valor para o label da coluna. Senão, usamos o valor da largura.
      xCategory: xAxisLabelDimension ? rows[0][xAxisLabelDimension].value : widthValue.toLocaleString()
    };

    stackKeys.forEach(stackKey => {
      const foundRow = rows.find(r => r[stackDimension].value === stackKey);
      entry[stackKey] = foundRow ? foundRow[heightMeasure].value : 0;
      // Guardar a célula original para o drilldown
      if (foundRow) {
          entry[`_cell_${stackKey}`] = foundRow[heightMeasure];
      }
    });
    return entry;
  });

  // Usar d3.stack para calcular as posições y0 e y1
  const stack = d3.stack().keys(stackKeys);
  const stackedSeries = stack(stackedDataInput);

  // O total para a escala X é a soma dos valores únicos da medida de largura
  const totalValue = d3.sum(Array.from(dataByColumn.keys()));
  
  // O máximo para a escala Y é o máximo dos valores da medida de largura
  // (porque a altura de cada coluna empilhada é a sua largura total neste modelo)
  const yMax = d3.max(Array.from(dataByColumn.keys()));


  // *****************************************************************
  // 3. RENDERIZAÇÃO (PRATICAMENTE IDÊNTICA)
  // *****************************************************************
  
  // ... (a partir daqui, o código de renderização, escalas, tooltips, etc.,
  // é EXATAMENTE o mesmo da versão premium anterior, porque a estrutura 
  // 'stackedSeries' que criámos é a mesma)

  // Ajustar layout...
  this._container.style('flex-direction', config.legend_position === 'right' ? 'row' : 'column');
  this._legend.style('display', config.show_legend ? 'block' : 'none');
  
  const svgEl = this._svg.node();
  const margin = { top: 20, right: 20, bottom: 40, left: 50 }; // Aumentar bottom para labels do eixo X
  const width = svgEl.clientWidth - margin.left - margin.right;
  const height = svgEl.clientHeight - margin.top - margin.bottom;

  this._svg.selectAll('*').remove();
  const g = this._svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Escalas
  const xScale = d3.scaleLinear().domain([0, totalValue]).range([0, width]);
  const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]); // Usar yMax
  const colorScale = d3.scaleOrdinal().domain(stackKeys).range(config.color_range);

  // EIXO X (agora podemos ter labels!)
  const xAxisGroup = g.append("g")
    .attr("transform", `translate(0,${height})`)
    .attr("class", "marimekko-axis");

  // Desenhar os retângulos e calcular posições do eixo X
  let cumulativeWidth = 0;
  const xPositions = []; // Guardar posições para os labels do eixo X

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
      .on('mouseover', /* ...código do tooltip igual... */)
      .on('mousemove', /* ...código do tooltip igual... */)
      .on('mouseout', /* ...código do tooltip igual... */)
      .on('click', /* ...código do drilldown igual... */);

  // Adicionar os labels do Eixo X
  xAxisGroup.selectAll('.x-axis-label')
    .data(xPositions)
    .join('text')
    .attr('class', 'x-axis-label')
    .attr('x', d => xScale(d.pos))
    .attr('y', margin.bottom / 2)
    .attr('text-anchor', 'middle')
    .style('fill', '#333')
    .text(d => d.label);
      
  // ... (o resto do código para labels dos segmentos, eixo Y, legenda, etc., continua igual)
  // ...
  
  doneRendering();
}
