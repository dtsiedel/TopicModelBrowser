//TODO: fix ugly bits of code
//TODO: make a function for repeated code in filter?
//TODO: don't let colors repeat next to each other

//TODO: the rest of the entire project

//globals
var csv_data;
var threshold = 0.05; //how high must a topic be to be included?
var colors = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
var gray = "#7d8084";
var arc_delay = 250;

//driver
function main()
{
    getData();
}

//inverts color, for use in tooltip. Maybe ugly and bad?
function invert(rgb) {
  rgb = Array.prototype.join.call(arguments).match(/(-?[0-9\.]+)/g);
  for (var i = 0; i < rgb.length; i++) {
    rgb[i] = (i === 3 ? 1 : 255) - rgb[i];
  }
  return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
}

//gives a random index in the range of our documents
function randomDocument()
{
    return Math.floor(Math.random()*csv_data.length); 
}

//parses our csv hosted on server
function getData()
{
    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        var target = randomDocument();
        console.log(target);
        constructChart(target);
    });
}

//filter out topics that are less than thresh or invalid
function filter(topic_array)
{
    var filtered = [];
    var total = 0; //total should add to one, need this to see total of "other"
    var count = 1; //start at one since other is 0 
    for(key in topic_array)
    {
        if(key.length === 0)
            continue
        if(topic_array[key] < threshold)
            continue
        var val = topic_array[key];
        var newEntry = {};
        newEntry["index"] = count; //TODO: method to insert these key values?
        newEntry["topic"] = key;
        newEntry["value"] = parseFloat(val); 
        newEntry["color"] = randomColor();
        filtered.push(newEntry);
        total += parseFloat(val);
        count++;
    }
    var other = {};
    other["index"] = 0;
    other["topic"] = "other";
    other["value"] = 1 - total;
    other["color"] = gray;
    filtered.push(other);
    console.log(filtered);
    return filtered;
}

//get a random color from the colors array
function randomColor()
{
    return colors[Math.floor(Math.random()*colors.length)]; 
}

//main work of making donut chart
function constructChart(n)
{
    var firstTopic = csv_data[n];
    var filteredData = filter(firstTopic);

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
        .data(pie(filteredData))
        .enter().append("g")
        .attr("class", "arc");


    g.append("path")
      .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
      .on("mousemove", function(d){
            var tip_text = d3.select(this).data()[0]["data"]["topic"]; //TODO: this is very ugly
            var inverted_color = invert(d3.select(this).style("fill"));
            var inverted_color = "white";
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").style("color", inverted_color).text(tip_text + " (" + (d.value * 100).toFixed(1) + "%)");
       })
      .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
      .style("fill", function(d) { return d.data.color; })
      .transition().delay(function(d, i) { return i * arc_delay; }).duration(arc_delay)
      .attr("id", function(d,i) { return "arc_"+i; })
      .attrTween('d', function(d) {
           var i = d3.interpolate(d.startAngle, d.endAngle-.01); //calculate the in between positions to draw in 
           return function(t) {
               d.endAngle = i(t);
             return arc(d);
           }
        }).each("end", function(d,i) {
            //Append the month names within the arcs
            if(i == filteredData.length - 1)
            {
                g.selectAll(".arcText")
                        .data(filteredData)
                   .enter().append("text")
                        .attr("class", "monthText")
                        .attr("x", 7) //Move the text from the start angle of the arc
                        .attr("dy", 18) //Move the text down
                        .attr("letter-spacing", "1px")
                        .style("font-family", "sans-serif")
                   .append("textPath")
                        .attr("xlink:href",function(d,i){return "#arc_"+i;}) //xlink seems to bind the text to the arc
                        .text(function(d){if(d.index === 0){return "Other";} return "T" + d.index;}) 
                        .style("fill", "white");	 
            }
    });
}
