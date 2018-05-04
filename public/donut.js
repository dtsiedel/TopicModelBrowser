var gray = "#7d8084";
var arc_delay = 250;
var margin;
var width;
var height;
var radius;
var chart;
var tooltip;

//driver
function donutMain(parameters)
{
    setUpDonut(parameters);
}

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructDonut function the first time
function setUpDonut(doc)
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 1000 - margin.left - margin.right;
    height = width - margin.top - margin.bottom - 500;
    radius = Math.min(width, height) / 2.5;

    addCorpusLink(pages.donut, donut_agg_link, doc);

    // add the canvas to the DOM 
    chart = d3.select("#chart-container")
        .append('svg')
        .attr("id", "donut-svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + ((width/4)) + "," + ((height/2)+margin.top) + ")");

    constructDonut(doc);
}

//comparison function to use when sorting our topics
function compare_value(a,b)
{
    return (a.value < b.value) ? 1 : -1;
}

//passed to addCorpusLink
function donut_agg_link(doc)
{
    var back_x = $(".aggregate-button").offset().left + 3;
    var back_y = $(".aggregate-button").offset().top + 20;
    d3.select(".dropdown-agg").style("visibility","visible").style("top", back_y+"px").style("left",back_x+"px")
    d3.select(".dropdown-agg").html(generate_dropdown_aggregate_html());
    d3.selectAll(".dropdown-element").on("mouseover", function() { d3.select(this).style("background-color", "#72a6f9"); });
    d3.selectAll(".dropdown-element").on("mouseout", function() { d3.select(this).style("background-color", "white"); });
    d3.selectAll(".dropdown-element").on("click", function() 
    { 
        var type = d3.select(this).text();
        goTo(pages.donut, pages.agg_single, [type, get_aggregate(type, csv_data[doc][type])], false);
    });
}

//main work of making donut chart
function constructDonut(n)
{
    var chosenDocument = csv_data[n];
    var filteredData = filter(chosenDocument);

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
                goTo(pages.donut, pages.topic, [d.data.index, 1]);
            }
        });

    chart.selectAll('.legend').remove();

    getDocumentData([n,0], function()
    {
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
                            .text(conditional_clip(document_text[n].url, 30))
                            .style("fill", "white")
                            .on("mouseover", function(){return tooltip.style("visibility", "visible");}) 
                            .on("mousemove", function(d){
                                    return tooltip.style("top", (event.pageY+20)+"px").style("left",(event.pageX+10)+"px").html(generate_document_tooltip(n)).style("background-color", gray).style("color", "white");})
                            .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
                            .on("click", function(){ 
                                var url = document_text[n]["url"];
                                window.open(url, "_blank");
                            });
                        
                        addLegend(chart, filteredData, 18, 12, pages.donut);
                }
        });

        chart.append("text")
            .attr("class", "donut_title")
            .attr("x", -90)
            .attr("y", -200)
            .style("font-size", "35px")
            .style("fill", "white")
            .text(conditional_clip(document_text[n]["title"], 30));

        make_clickable("path");
        make_clickable(".arc_text");
    });

    make_clickable("button");
}

//cleanup all things created by donut
function donutCleanup()
{
    d3.select(".tooltip").style("visibility", "hidden");
    d3.select("#donut-svg").remove();
    removeCorpusButton();
}


