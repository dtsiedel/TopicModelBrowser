var chart;
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
 
    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        csv_data = rectify_csv_data(csv_data);
        
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
            var t_num = topic_indices[key];
            if(key.length !== 0 && current[key] > threshold)
            {
                if(!(t_num in result))
                {
                    result[t_num] = [current[""]]; //for some reason they come in with the key for doc id as ""
                }
                else
                {
                    result[t_num].push(current[""]);
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

    generateRibbonData(reformat); 
    
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

//go through the matrix and process the values, and apply threshold
function process(matrix)
{
    var maxRow = matrix.map(function(row){ return Math.max.apply(Math, row); });
    var max = Math.max.apply(null, maxRow);
    
    for(var i = 0; i < matrix.length; i++)
    {
        var current = matrix[i];
        for(var j = 0; j < current.length; j++)
        {
            if((i === j) || (current[j] <= corpus_threshold))
            {
                current[j] = 0;
            }
            current[j] /= (max/5); //scale so it renders appropriately
        }
    } 
}

//make the corpus view, incuding arcs and ribbons
function constructCorpus(csv)
{
    //var processed = processData(csv);   //don't do this anymore, since it is done offline
 
    var matrix = ribbon_counts; 
    var n_topics = matrix.length;
    console.log(n_topics);
    process(matrix); 

    var width = 600,
        height = 600,
        outerRadius = Math.min(width, height) / 2 - 10,
        innerRadius = outerRadius - 24;
     
    var formatPercent = d3.format(".1%");
     
    var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);
     
    var layout = d3.layout.chord()
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

    var defs = svg.append('defs');


    var info = d3.select("body").append("div")
        .attr("class", "info-box")
        .attr("width", "500px")
        .attr("height", "500px")
        .text("Click a chord to see the documents joining those two documents!");
         
    svg.append("circle")
        .attr("r", outerRadius);
     
    // Compute the chord layout.
    layout.matrix(matrix);
     
    // Add a group per neighborhood.
    var group = svg.selectAll(".group")
        .data(layout.groups)
        .enter().append("g")
        .attr("class", "group")
        .style("fill",  "white")
        .on("mouseover", mouseover);
     
    // Add the group arc.
    var groupPath = group.append("path")
        .attr("id", function(d, i) { return "group" + i; })
        .attr("d", arc)
        .style("stroke", gray)
        .style("stroke-width", .05)
        .on("click", function(d,i) {document.title="Topic " + i;})
        .style("fill", function(d) { return getColor(d.index % n_topics); });
     
    // Add a text label.
    var groupText = group.append("text")
        .attr("x", 6)
        .attr("dy", 15);
     
    groupText.append("textPath")
        .attr("xlink:href", function(d, i) { return "#group" + i; })
        .text(function(d, i) { return ""; });
     
    // Add the chords.
    var chord = svg.selectAll(".chord")
        .data(layout.chords)
        .enter().append("path")
        .each(function(d,i) {
            var linearGradient = defs.append("linearGradient")
                .attr("id", "linear-gradient" + d.source.index + "-" + d.target.index); 

            linearGradient
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", function() {return innerRadius*Math.cos((d.source.endAngle-d.source.startAngle)/2+d.source.startAngle-Math.PI/2);})
                .attr("y1", function() {return innerRadius*Math.sin((d.source.endAngle-d.source.startAngle)/2+d.source.startAngle-Math.PI/2);})
                .attr("x2", function() {return innerRadius*Math.cos((d.target.endAngle-d.target.startAngle)/2+d.target.startAngle-Math.PI/2);})
                .attr("y2", function() {return innerRadius*Math.sin((d.target.endAngle-d.target.startAngle)/2+d.target.startAngle-Math.PI/2);});

            linearGradient.append("stop") 
                .attr("offset", "0%")   
                .attr("stop-color", getColor(d.target.index)); 

            linearGradient.append("stop") 
                .attr("offset", "100%")   
                .attr("stop-color", getColor(d.source.index)); 
        })
        .attr("class", "chord")
        .style("stroke", "white") 
        .style("fill", function(d) { return "url(#linear-gradient" + d.source.index + "-" + d.target.index + ")";})
        .on("click", chordselected)
        .attr("d", path);
         
    function chordselected(d) {
        var text = generate_document_info(d.source.index, d.target.index);
        info.html(text);
    }

    function mouseover(d, i) {
        chord.classed("fade", function(p) {
            return p.source.index !== i && p.target.index !== i;
        });
    }
}

function generate_document_info(source, target)
{
    var result = "Topic ";
    result += source + " and Topic ";
    result += target + " Shared Documents:<br><br>";
    var docs = ribbon_data[source][target]; 
    for(var i = 0; i < docs.length; i++)
    {
        if(i > chord_threshold)
        {
            break;
        }
        result += "<a href=\"/donut?doc=" + docs[i] + "\">Document " + docs[i] + "</a><br>"; 
    }
    return result;
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
