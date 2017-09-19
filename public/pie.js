
function main()
{
    //need some data to represent
    var data = [{name: "one", value: 430, color:"#391029"},
                {name: "two", value: 500, color:"#FEABCE"},
                {name: "three", value: 250, color:"#123ABC"},
                {name: "four", value: 400, color:"#ADDBAD"},
                {name: "five", value: 600, color:"#FADCAB"},
                {name: "six", value: 350, color:"#AFE421"}];

    //variables to control the graph result
    var margin = {top: 20, right: 20, bottom: 20, left: 20};
    var width = 400 - margin.left - margin.right;
    var height = width - margin.top - margin.bottom;
    var radius = Math.min(width, height) / 2;

    function arcTween(d) {
      arc = d3.arc().outerRadius(radius*1.1).innerRadius(radius-50).cornerRadius(5);
      return arc(d);
    }

    function donutTween(b) {
      b.outerRadius= radius * 1.2;
      var i = d3.interpolate({outerRadius: 0}, b);
      return function(t) { return arc(i(t)); };
    }
    
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
        .attr("class", "arc")
        ;
        /*
        .on("mouseover", function(d){
            console.log("on");
            d3.select(d).transition().duration(250).attrTween("d",donutTween);
        })
        .on("mouseout", function(){
            console.log("off")
        });
        */

    g.append("path")
      .style("fill", function(d) { return d.data.color; })
      .transition().delay(function(d, i) { return i * 500; }).duration(500)
      .attr("id", function(d,i) { return "arc_"+i; })
      .attrTween('d', function(d) {
           var i = d3.interpolate(d.startAngle, d.endAngle-.01); //calculate the in between positions to draw in 
           return function(t) {
               d.endAngle = i(t);
             return arc(d);
           }
        }).on("end", function(d,i) {
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
