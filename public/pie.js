function main()
{
    //need some data to represent
    var data = [{name: "one", value: 430},
                {name: "two", value: 500},
                {name: "three", value: 275},
                {name: "four", value: 400},
                {name: "five", value: 600},
                {name: "six", value: 350}];

    //variables to control the graph result
    var margin = {top: 20, right: 20, bottom: 20, left: 20};
    var width = 400 - margin.left - margin.right;
    var height = width - margin.top - margin.bottom;
    var radius = Math.min(width, height) / 2;
    
    //colors of each section of the wheel
    var color = d3.scaleOrdinal().range(["#391029", "#FEABCE", "#123ABC", "#ADDBAD", "#FADCAB", "#AFE421"]);

    // add the canvas to the DOM 
    var chart = d3.select("#pie-demo")
        .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + ((width/2)+margin.left) + "," + ((height/2)+margin.top) + ")");
    
    var arc = d3.arc()
        .outerRadius(radius)
        .innerRadius(radius - 50)
        .cornerRadius(5);

    var pie = d3.pie()
        .sort(null)
        .startAngle(Math.PI)
        .endAngle(3.0*Math.PI)
        .value(function(d) { return d.value; });

    var g = chart.selectAll(".arc")
        .data(pie(data))
        .enter().append("g")
        .attr("class", "arc"); 

    g.append("path")
      .style("fill", function(d) { return color(d.data.name); })
      .transition().delay(function(d, i) { return i * 500; }).duration(500)
      .attr("id", function(d,i) { return "arc_"+i; })
      .attrTween('d', function(d) {
           var i = d3.interpolate(d.startAngle, d.endAngle-.01); //calculate the in between positions to draw in 
           return function(t) {
               d.endAngle = i(t);
             return arc(d);
           }
        });
    
    //Append the month names within the arcs
    g.selectAll(".arcText")
	    .data(data)
       .enter().append("text")
	    .attr("class", "monthText")
	    .attr("x", 5) //Move the text from the start angle of the arc
	    .attr("dy", 18) //Move the text down
       .append("textPath")
            .attr("xlink:href",function(d,i){return "#arc_"+i;})
	    .text(function(d){return "Topic " + d.name;})
	    .style("fill", "white");	 
}
