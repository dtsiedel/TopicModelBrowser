var chart;
var margin;
var width;
var height;
var tooltip;

var x_start = -100;
var x_end = 600;
var x_mid = (x_start + x_end) / 2;
var y_start = 0;
var y_end = -200;
var y_mid = (y_start + y_end) / 2;

//let us map from input range to output range
Number.prototype.map = function (in_min, in_max, out_min, out_max) {
  return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructSpectrum function the first time
//needs to be split later so that we can not duplicate code
function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 840 - margin.left - margin.right;
    height = width - margin.top - margin.bottom;
    radius = Math.min(width, height) / 2;

    chart = d3.select("#spectrum-demo")
        .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + ((width/4)) + "," + ((height/2)+margin.top) + ")");

    tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("width", "225px")
        .style("background-color", "white")
        .style("padding-left", "5px")
        .style("z-index", "10") //put it in front of the arcs
        .style("border-radius", "10px")
        .style("visibility", "hidden")
        .style("border", "1px solid white")
        .text("Error"); //bad to see this (obviously) 
 
    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        csv_data = rectify_csv_data(csv_data);

        var url_string = window.location.href; //fetch document we want to show
        var url = new URL(url_string);
        var t1 = url.searchParams.get("t1");
        var t2 = url.searchParams.get("t2");
        
        get_document_full_texts(function()
        {
            getRibbonData(function()
            {
                get_document_full_texts(function()
                {
                    if(t1 === null)
                    {
                        t1 = randomTopic();
                    }
                    if(t2 === null)
                    {
                        t2 = randomTopic();
                    }
                    constructSpectrum(t1, t2);
                });
            });
        });
    });
}


//make the spectrum view, including the two sides and the inner words
function constructSpectrum(t1, t2)
{
    var color_scale = d3.interpolateRgb(colors[t1], colors[t2]);
    var shared = ribbon_data[t1][t2];
    
    plotTopics(t1, t2, color_scale);
    plotDocuments(shared, t1, t2, color_scale);
}

//put the topic names onto the screen
function plotTopics(t1, t2, color_scale)
{
    chart.append("text")
        .attr("x", x_start)
        .attr("y", y_mid)
        .style("fill", color_scale(0))
        .style("font-size", "30px")
        .text("T" + t1)
        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
        .on("mousemove", function(d){
            var index = t1;
            var topic_text = reverse_topic_indices[index];
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_spectrum_tooltip(index, topic_text)).style("background-color", colors[index]).style("color", "white");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");})    
        .on("click", function() { window.location.href = "/topic?t=" + t1});

    chart.append("text")
        .attr("x", x_end - 10)
        .attr("y", y_mid)
        .style("fill", color_scale(1))
        .style("font-size", "30px")
        .text("T" + t2)
        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
        .on("mousemove", function(d){
            var index = t2;
            var topic_text = reverse_topic_indices[index];
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_spectrum_tooltip(index, topic_text)).style("background-color", colors[index]).style("color", "white");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");})    
        .on("click", function() { window.location.href = "/topic?t=" + t2});
}

//puts the documents from the document list onto the canvas
function plotDocuments(docList, t1, t2, color_scale)
{
    docList = sortRibbon(docList, t1, t2);
    var y_step = (y_start - y_end) / docList.length;
    var current_y = y_end;    
    var marked = [];
    var data = [];

    for(var i = 0; i < docList.length; i++)
    {
        var id = docList[i];
        var prop_1 = csv_data[id][reverse_topic_indices[t1]];
        var prop_2 = csv_data[id][reverse_topic_indices[t2]];
        var color = color_scale(.75*(prop_2-prop_1).map(-1,1,0,1));

        data.push({"id":id,"prop_1":prop_1,"prop_2":prop_2,"color":color,"cx":x_mid+(prop_2-prop_1)*(x_end-x_start)/2,"cy":current_y});

        current_y += y_step;
    }

    chart.selectAll(".node")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return d.cx; })
        .attr("cy", function(d) { return d.cy; }) 
        .attr("r", 3)
        .style("fill", function(d) {return d.color; })
        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) 
        .on("mousemove", function(d,i){
                return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_spectrum_document(d.id, d.prop_1, d.prop_2, d.t1, d.t2)).style("background-color", d.color).style("color", "white");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");}) 
        .on("click", function(d) {window.location.href = "/donut?doc="+d.id});
}

//make the tooltip for one document (point) in this graph
function generate_spectrum_document(id, prop_1, prop_2, t1, t2)
{
    var result = "<div>"+conditional_clip(document_text[id].title, 30);
    result += "<br><span class='id_t1'>" + (prop_1*100).toFixed(2) + "%" + " vs " + "<span class='id_t2'>" + (prop_2*100).toFixed(2) + "%";
    result += "<br>Excerpt:<br>";
    result += conditional_clip(document_text[id].text, 200);
    result += "</div>";
    return result;
}

//create the html for the tooltip div in this view
function generate_spectrum_tooltip(topic_number, topic_name)
{
    topic_words = topic_name.split("_");
    text = "<div>";
    if(topic_number === "~") //other
    {
        text += "Other";
    }
    else
    {
        text += "T" + topic_number;
    }
    text += "<br>Sample Words:<br>";
    for(var i = 0; i < topic_words.length; i++)
    {
        text += topic_words[i];
        text += "<br>"
    }
    text += "</div>";
    return text; 
}


//wrapper to be called when page loads
function main()
{
    getTopicIndices(getData); //eventually calling it just once will make it available to all views
}

//call main
document.addEventListener("DOMContentLoaded", function(e) {
    main();
});
