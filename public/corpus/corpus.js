var csv_data;
var filteredData;
var chart;
var arcPercentages = [];
var total_t_d_links = 0; //need this to compute proportions of topic relevance
var margin;
var width;
var height;
var radius;
var tooltip;

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructChart function the first time
//needs to be split later so that we can not duplicate code
function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 600 - margin.left - margin.right;
    height = width - margin.top - margin.bottom;
    radius = Math.min(width, height) / 2;

    // add the canvas to the DOM 
    chart = d3.select("#corpus-demo")
        .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("stroke", gray)
        .attr("stroke-width", "0.5")
        .attr("transform", "translate(" + ((width/2)) + "," + ((height/2)+margin.top) + ")"); 

    tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("width", "200px")
        .style("background-color", "white")
        .style("padding-left", "5px")
        .style("z-index", "10") //put it in front of the arcs
        .style("border-radius", "10px")
        .style("visibility", "hidden")
        .style("border", "1px solid white")
        .text("Error"); //bad to see this (obviously)

 
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
function constructCorpus(csv)
{
    filteredData = processData(csv)
    console.log(filteredData);

    for(var i=0; i<filteredData.length;i++)//in filteredData)
    {
        //var topic_name = filteredData[i].keys(); //are you kidding me javascript?
        var topic_name = Object.keys(filteredData[i])[0];
        var temp = {};
        temp["topic"] = topic_name;
        temp["value"] = arcPercentage(topic_name);
        temp["index"] = i;
        temp["color"] = randomColor(i);
        arcPercentages.push(temp);
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
        .data(pie(arcPercentages))
        .enter().append("g")
        .attr("class", "arc");
        

    g.append("path")
      .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
      .on("mousemove", function(d){
            console.log(d3.select(this).data()[0]["data"]);
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

//wrapper to be called when page loads
function main()
{
    getData();
}

//call main
document.addEventListener("DOMContentLoaded", function(e) {
    main();
});
