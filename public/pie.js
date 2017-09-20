
function main()
{
    //need some data to represent
    var data = [{name: "one", value: 430, color:"#391029", tooltip:"Various MetaData 1"},
                {name: "two", value: 500, color:"#FEABCE", tooltip:"Various MetaData 2"},
                {name: "three", value: 250, color:"#123ABC", tooltip:"Various MetaData 3"},
                {name: "four", value: 400, color:"#ADDBAD", tooltip:"Various MetaData 4"},
                {name: "five", value: 600, color:"#FADCAB", tooltip:"Various MetaData 5"},
                {name: "six", value: 350, color:"#AFE421", tooltip:"Various MetaData 6"}];

    //variables to control the graph result
    var margin = {top: 20, right: 20, bottom: 20, left: 20};
    var width = 400 - margin.left - margin.right;
    var height = width - margin.top - margin.bottom;
    var radius = Math.min(width, height) / 2;

    function arcTween(d) {
      arc = d3.svg.arc().outerRadius(radius*1.1).innerRadius(radius-50).cornerRadius(5);
      return arc(d);
    }
    
    var tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "10") //put it in front of the arcs
    .style("border-radius", "10px")
    .style("visibility", "hidden")
    .text("Error"); //bad to see this (obviously)
    
    // add the canvas to the DOM 
    var chart = d3.select("#pie-demo")
        .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + ((width/2)+margin.left) + "," + ((height/2)+margin.top) + ")");
    
    var arc = d3.svg.arc()
        .outerRadius(radius)
        .innerRadius(radius - 50)
        .cornerRadius(5);
    
    var pie = d3.layout.pie()
        .sort(null)
        .startAngle(Math.PI)
        .endAngle(3.0*Math.PI)
        .value(function(d) { return d.value; });

    var g = chart.selectAll(".arc")
        .data(pie(data))
        .enter().append("g")
        .attr("class", "arc");

    g.append("path")
      .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip
      .on("mousemove", function(){
            var tip_text = d3.select(this).data()[0]["data"]["tooltip"]; //TODO: this is very ugly
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").text(tip_text);
       })
      .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
      .style("fill", function(d) { return d.data.color; })
      .transition().delay(function(d, i) { return i * 500; }).duration(500)
      .attr("id", function(d,i) { return "arc_"+i; })
      .attrTween('d', function(d) {
           var i = d3.interpolate(d.startAngle, d.endAngle-.01); //calculate the in between positions to draw in 
           return function(t) {
               d.endAngle = i(t);
             return arc(d);
           }
        }).each("end", function(d,i) {
            //Append the month names within the arcs
            if(i == data.length - 1)
            {
                g.selectAll(".arcText")
                        .data(data)
                   .enter().append("text")
                        .attr("class", "monthText")
                        .attr("x", 7) //Move the text from the start angle of the arc
                        .attr("dy", 18) //Move the text down
                        .attr("letter-spacing", "1px")
                        .style("font-family", "sans-serif")
                   .append("textPath")
                        .attr("xlink:href",function(d,i){return "#arc_"+i;})
                        .text(function(d){return "Topic " + d.name;})
                        .style("fill", "white");	 
            }
    });
}
