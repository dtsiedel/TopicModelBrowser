var gray = "#7d8084";
var arc_delay = 250;
var margin;
var width;
var height;
var radius;
var chart;
var tooltip;

//driver
function agg_singleMain(parameters)
{
    setUpagg_single(parameters);
}

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructDonut function the first time
function setUpagg_single(agg)
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 1000 - margin.left - margin.right;
    height = width - margin.top - margin.bottom - 500;
    radius = Math.min(width, height) / 2.5;

    addCorpusLink(pages.agg_single, null, null);

    // add the canvas to the DOM 
    chart = d3.select("#chart-container")
        .append('svg')
        .attr("id", "agg-svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + ((width/4)) + "," + ((height/2)+margin.top) + ")");

    constructagg_single(agg);
}

//comparison function to use when sorting our topics
function compare_value(a,b)
{
    return (a.value < b.value) ? 1 : -1;
}

//adding scala-like filter to js (except it's reversed)
Array.prototype.filter = function(callback) {
    var i = this.length;
    while (i--) {
        if (callback(this[i], i)) {
            this.splice(i, 1);
        }
    }
};

//main work of making donut chart
function constructagg_single(arr)
{
    var type = arr[2];
    var n = arr[1];
   
    var chosenAgg = aggregate_data[n];
    var filteredData = filter(chosenAgg,agg_topic_threshold);

    function arcTween(d) {
        arc = d3.svg.arc().outerRadius(radius*1.1).innerRadius(radius-50).cornerRadius(5);
        return arc(d);
    }
    
    var arc = d3.svg.arc()
        .outerRadius(radius)
        .innerRadius(radius - 50)
        .cornerRadius(5);
    
    var pie = d3.layout.pie()
        .sort(null)
        .startAngle(0)
        .endAngle(2*Math.PI)
        .value(function(d) { return d.value; });

    var g = chart.selectAll(".arc")
        .data(pie(filteredData))
        .enter().append("g")
        .attr("class", "arc")
        .on("click", function(d) {
            if(d.data.index !== "~")
            {
                goTo(pages.agg_single, pages.topic, [d.data.index, 1]);
            }
        });

    chart.selectAll('.legend').remove();

    g.append("path")
        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
        .on("mousemove", function(d){
            var topic_text = d3.select(this).data()[0]["data"]["topic"]; 
            var index = d3.select(this).data()[0]["data"]["index"];
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_tooltip_html(index, topic_text, d.value)).style("background-color", d.data.color).style("color", "white");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
        .style("fill", function(d,i) { return d.data.color; })
        .transition().duration(750)
        .attr("id", function(d,i) { return "arc_"+i; })
        .attrTween('d', function(d) {
            var i = d3.interpolate(d.startAngle, d.endAngle-.01); //calculate the in between positions to draw in 
            return function(t) {
                d.endAngle = i(t);
                return arc(d);
            }
        }).each("end", function(d,i) {
            //Append the month names within the arcs after all have loaded
            if(i == filteredData.length - 1)
            {
                g.selectAll(".arcText")
                        .data(filteredData)
                   .enter().append("text")
                        .attr("class", "arcText")
                        .attr("x", 7) //Move the text from the start angle of the arc
                        .attr("dy", 18) //Move the text down
                        .attr("letter-spacing", "1px")
                        .style("font-family", "helvetica")
                   .append("textPath")
                        .attr("xlink:href",function(d,i){return "#arc_"+i;}) //xlink seems to bind the text to the arc
                        .text(function(d){if(d.index === '~'){return "Other";} return "T" + d.index;}) 
                        .style("fill", "white");	 
                    
                    chart.append("text")
                        .attr("text-anchor", "middle")
                        .attr("class", "donut_url")
                        .style("fill", "white")
                        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) 
                        .on("mousemove", function(d){
                                return tooltip.style("top", (event.pageY+20)+"px").style("left",(event.pageX+10)+"px").html(generate_document_tooltip(n)).style("background-color", gray).style("color", "white");})
                        .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
                        .on("click", function(){ 
                            var url = document_text[n]["url"];
                            window.open(url, "_blank");
                        });
                    
                addLegend(chart, filteredData, 18, 12, pages.agg_single);
            }
    });

    chart.append("text")
        .attr("class", "donut_title")
        .attr("x", -90)
        .attr("y", -200)
        .style("font-size", "35px")
        .style("fill", "white")
        .text(aggregate_data[n]["agg_name"]);

    make_clickable("path");
    make_clickable(".arc_text");

    make_clickable("button");
}

//cleanup all things created by donut
function agg_singleCleanup()
{
    d3.select(".tooltip").style("visibility", "hidden");
    d3.select("#agg-svg").remove();
    removeCorpusButton();
}


