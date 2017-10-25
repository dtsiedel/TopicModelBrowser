var csv_data;
var chart;
var topicData = [];
var total_t_d_links = 0; //need this to compute proportions of topic relevance
var margin;
var width;
var height;
var radius;
var tooltip;

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructCorpus function the first time
//needs to be split later so that we can not duplicate code
function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 600 - margin.left - margin.right;
    height = width - margin.top - margin.bottom;
    radius = Math.min(width, height) / 2;

    // add the canvas to the DOM 
//    chart = d3.select("#corpus-demo")
//        .append('svg')
//        .attr("width", width + margin.left + margin.right)
//        .attr("height", height + margin.top + margin.bottom)
//        .append("g")
//        .attr("stroke", gray)
//        .attr("stroke-width", "0.5")
//        .attr("transform", "translate(" + ((width/2)) + "," + ((height/2)+margin.top) + ")"); 
 
    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        constructCorpus(csv_data);
    });
}

//get relevant data from CSV
//result is a dictionary containing each of the topics as keys. The value of each 
//of these topics is the list of all of the document numbers that are > threshold in being "about" that topic
function processData(csv)
{
    result = {};
    for(var i=0;i<csv.length;i++)
    {
        var current = csv[i];
        for(key in current)
        {
            if(key.length !== 0 && current[key] > threshold)
            {
                if(!(key in result))
                {
                    result[key] = [current[""]]; //for some reason they come in with the key for doc id as ""
                }
                else
                {
                    result[key].push(current[""]);
                }
                total_t_d_links++;
            }
        }
    } 

    var reformat = []
    for(key in result)
    {
        var temp = {};
        temp[key] = result[key];
        reformat.push(temp);
    }

    //generateRibbonData(reformat); //this is now done offline
    
    return reformat;
}

//what proportion of the total T_D links are attributed to this topic?
//used to calculate the percentage of the circle that should be taken up
//by this topic
function arcPercentage(topic_name)
{
    for(key in filteredData)
    {
        var current = filteredData[key];
        if(topic_name in current)
        {
            return current[topic_name].length / total_t_d_links;
        } 
    }
    return 0;
}

//do all the steps needed to build the corpus view from the csv data
/*
function constructCorpus(csv)
{
    filteredData = processData(csv);

    for(var i=0; i<filteredData.length;i++)
    {
        var topic_name = Object.keys(filteredData[i])[0];
        var temp = {};
        temp["topic"] = topic_name;
        temp["value"] = arcPercentage(topic_name);
        temp["index"] = topic_indices[topic_name];
        temp["color"] = getColor(topic_indices[topic_name]);
        topicData.push(temp);
    }

    function arcTween(d) {
        arc = d3.svg.arc().outerRadius(radius*1.1).innerRadius(radius-50).cornerRadius(5);
        return arc(d);
    }

    var arc = d3.svg.arc()
        .outerRadius(radius)
        .innerRadius(radius - 30)
        .cornerRadius(5);

    var pie = d3.layout.pie()
        .sort(null)
        .startAngle(0)
        .endAngle(2*Math.PI)
        .value(function(d) { return d.value; });

    var g = chart.selectAll(".arc")
        .data(pie(topicData))
        .enter().append("g")
        .attr("class", "arc");
        

    g.append("path")
      .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
      .on("mousemove", function(d){
            var topic_text = d3.select(this).data()[0]["data"]["topic"]; 
            var index = d3.select(this).data()[0]["data"]["index"];
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_tooltip_html(index, topic_text, d.value)).style("background-color", d.data.color).style("color", "white");})
      .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
      .style("fill", function(d) { return d.data.color; })
      .transition().duration(750)
      .attr("id", function(d,i) { return "arc_"+i; })
      .attrTween('d', function(d) {
           var i = d3.interpolate(d.startAngle, d.endAngle-.01); //calculate the in between positions to draw in 
           return function(t) {
               d.endAngle = i(t);
             return arc(d);
    }});
}
*/


//TEMP function
//this processing should eventually be done for the offline version and saved on the server
//instead of doing it dynamically
//unless it's better to do it now so that we can vary the threshold?
function process(matrix)
{
    for(var i = 0; i < matrix.length; i++)
    {
        var current = matrix[i];
        for(var j = 0; j < current.length; j++)
        {
            if((i === j) || (current[j] <= corpus_threshold))
            {
                current[j] = 0;
            }
        }
    } 
}

//build the arcs and ribbons
function constructCorpus(csv)
{
    var matrix = ribbon_counts; 
    process(matrix); 
        
    console.log(matrix);

    var width = 720,
        height = 720,
        outerRadius = Math.min(width, height) / 2 - 10,
        innerRadius = outerRadius - 24;
     
    var formatPercent = d3.format(".1%");
     
    var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);
     
    var layout = d3.layout.chord()
        .padding(.04)
        .sortSubgroups(d3.descending)
        .sortChords(d3.ascending);
     
    var path = d3.svg.chord()
        .radius(innerRadius);
     
    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("id", "circle")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
         
    svg.append("circle")
        .attr("r", outerRadius);
     
    // Compute the chord layout.
    layout.matrix(matrix);
     
    // Add a group per neighborhood.
    var group = svg.selectAll(".group")
        .data(layout.groups)
        .enter().append("g")
        .attr("class", "group")
        .on("mouseover", mouseover);
     
    // Add the group arc.
    var groupPath = group.append("path")
        .attr("id", function(d, i) { return "group" + i; })
        .attr("d", arc)
        .style("fill", function(d, i) { return gray; /*return cities[i].color; */});
     
    // Add a text label.
    var groupText = group.append("text")
        .attr("x", 6)
        .attr("dy", 15);
     
    groupText.append("textPath")
        .attr("xlink:href", function(d, i) { return "#group" + i; })
        .text(function(d, i) { return "test"; /*return cities[i].name; */});
     
    // Add the chords.
    var chord = svg.selectAll(".chord")
        .data(layout.chords)
        .enter().append("path")
        .attr("class", "chord")
        .style("fill", function(d) { return gray; /*return cities[d.source.index].color;*/ })
        .attr("d", path);
         
    // Add an elaborate mouseover title for each chord.
     chord.append("title").text(function(d) {
//         return cities[d.source.index].name
//         + " → " + cities[d.target.index].name
//         + ": " + formatPercent(d.source.value)
//         + "\n" + cities[d.target.index].name
//         + " → " + cities[d.source.index].name
//         + ": " + formatPercent(d.target.value);
        return "test";
     });
     
    function mouseover(d, i) {
        chord.classed("fade", function(p) {
            return p.source.index != i && p.target.index != i;
        });
    }
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
