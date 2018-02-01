var chart;
var margin;
var width;
var height;
var radius;
var tooltip;
var selected = [];
var dragSelecting = false;

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

    if(d3.selectAll(".tooltip")[0].length === 0)
    {
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
            .text(""); //bad to see this (obviously)
    }

    if(!loaded_data)
    {    
        d3.select("#chart-container").append("div").attr("class", "loader");
        d3.select("#chart-container").append("div").attr("class", "load-text").html("<br/>Loading Data...");
        d3.select(".loader").style("border-top", "16px solid " + randomColor()); 
        getTopicIndices(function()
        {
            d3.select(".loader").style("border-top", "16px solid " + randomColor()); 
            d3.csv("/topic_frame.csv", function(error, response) 
            {
                d3.select(".loader").style("border-top", "16px solid " + randomColor()); 
                //get_document_full_texts(function()
                //{
                    csv_data = response;
                    csv_data = rectify_csv_data(csv_data);
                   
                    d3.select(".loader").remove();
                    d3.select(".load-text").remove();
                    constructCorpus(csv_data);
                //});
            });
        });
        loaded_data = true;
    }
    else
    {
        getTopicIndices(function(){constructCorpus(csv_data)}); //should be just constructCorpus(csv_data) but it doesnt work
    }
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
    
    /*
    for(var i = 0; i < matrix.length; i++)
    {
        var current = matrix[i];
        for(var j = 0; j < current.length; j++)
        {
            if((i === j) || (current[j] <= corpus_threshold))
            {
                current[j] = 0;
            }
            current[j] /= max; //scale so it renders appropriately
        }
    }
    */

    var d = csv_data.length;
    sum = 0;
    for(var i = 0; i < matrix.length; i++)
    {
        var current = matrix[i];
        var r = current[i]; //matrix[i][i] should be total number of topics about topic i
        var s = 0; //row sum

        for(var j = 0; j < current.length; j++)
        {  
            if(i !== j)
            {
                s += parseInt(current[j]);
            }
        }

        for(var j = 0; j < current.length; j++)
        {
            if(current[j] <= corpus_threshold)
            {
                current[j] = 0;
            }  
            else
            {
                current[j] = current[j] * (r / s);
            }
            current[j] /= max;  //scale so it renders appropriately
        }
    }
}

//make the corpus view, incuding arcs and ribbons
function constructCorpus(csv)
{
    //var processed = processData(csv);   //don't do this anymore, since it is done offline

    var matrix = ribbon_counts; 
    var n_topics = matrix.length;
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
        .attr("id", "corpus-svg")
        .append("g")
        .attr("id", "circle")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var defs = svg.append('defs');

    var info = d3.select("body").append("div")
        .attr("class", "info-box")
        .attr("width", "500px")
        .attr("height", "500px")
        .text("Click a chord to see the documents joining those two topics!");
         
    svg.append("circle")
        .attr("r", outerRadius);
     
    // Compute the chord 
    layout.matrix(matrix);
    
    // Add a group per topic
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
        .on("click", function(d,i) {
            goTo(pages.corpus, pages.topic, d.index);
        })
        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
        .on("mousemove", function(d){
            var topic_text = reverse_topic_indices[d.index];
            var index = d.index; 
            var value = d.value / parseFloat(100); 
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_tooltip_html(index, topic_text, value)).style("background-color", colors[index]).style("color", "white");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
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
        generate_document_info(d.source.index, d.target.index, function(result)
        {
            text=result;
            selected = []; //need to reset this between chord clicks
            info.html(text);
            d3.selectAll(".checkbox").on("click", function() { toggle_check_box(d3.select(this).attr("data-id")); });
            d3.selectAll(".checktitle-container").on("mousedown", function() {
                dragSelecting = true;
                var current = d3.select(this).attr("data-id");
                visually_toggle(current); 
                toggle_check_box(current);
            });
            d3.selectAll(".checktitle-container").on("mouseover", function() {
                if(dragSelecting){
                    var current = d3.select(this).attr("data-id");
                    visually_toggle(current);
                    toggle_check_box(current);
                }
            });
            d3.selectAll("html").on("mouseup", function() {
                dragSelecting = false;
            });
            d3.selectAll(".t1").style("color", colors[d.source.index]);
            d3.selectAll(".t2").style("color", colors[d.target.index]);
            d3.selectAll(".title").style("font-size", "20px"); 
            d3.select("#topic_compare").on("click", function(){
                goTo(pages.corpus, pages.spectrum, [d.source.index, d.target.index]);
            });
            d3.select("#document_compare").on("click", function() {
                if(selected.length > 2){
                    goTo(pages.corpus, pages.nodes, selected);
                }
                else if(selected.length === 2){
                    goTo(pages.corpus, pages.bars, selected);
                }
            });
            d3.select("#document_single").on("click", function() {
                if(selected.length === 1)
                {
                    goTo(pages.corpus, pages.donut, selected[0]);
                }
            });
        });
    }

    function mouseover(d, i) {
        chord.classed("fade", function(p) {
            return p.source.index !== i && p.target.index !== i;
        });
    }
}

//change the appearance of checkbox when clicking title
function visually_toggle(index)
{
    var element = d3.selectAll(".check"+index);
    if(element.property("checked"))
        element.property("checked",false);
    else
        element.property("checked",true);
}

//handle checkbox state
function toggle_check_box(id)
{
    //to translate javascript: if the id is in the list, remove it. Else add it. AKA toggle existence in list
    if(selected.indexOf(id) > -1)
    {
        selected.splice(selected.indexOf(id), 1);
    }
    else
    {
        selected.push(id);
    }

    if(selected.length === 1)
    {
        d3.select("#document_single").style("background-color", "red").style("cursor", "default");
        d3.select("#document_compare").style("background-color", "green").style("cursor", "default");
    }
    else if(selected.length > 0)
    {
        d3.select("#document_single").style("background-color", "#d3d3d3").style("cursor", "not-allowed");
        d3.select("#document_compare").style("background-color", "green").style("cursor", "default");
    }
    else
    {
        d3.select("#document_single").style("background-color", "#d3d3d3").style("cursor", "not-allowed");
        d3.select("#document_compare").style("background-color", "#d3d3d3").style("cursor", "not-allowed");
    }
}

//make the html element that goes on the right
function generate_document_info(source, target, callback)
{
    var result = "<span class='t1 title'>Topic ";
    result += source + "</span> and <span class='t2 title'> Topic ";
    result += target + "</span> Shared Documents:<br>";
    result += "<button class='corpus-button' id='topic_compare' type='button'>Compare these topics!</button><br/>";
    result += "<button class='corpus-button' id='document_compare' type='button'>Compare selected documents!</button>";
    result += "<button class='corpus-button' id='document_single' type='button'>View single document!</button><br/>";
    var docs = ribbon_data[source][target]; 
    docs = sortRibbon(docs, source, target);
    docs = docs.slice(0,100);
    getDocumentData(docs, function()
    {
        for(var i = 0; i < docs.length; i++)
        {
            if(i > chord_threshold)
            {
                break;
            }
            var title = conditional_clip(document_text[docs[i]]["title"], 50);
            result += "<input class='checkBox check"+docs[i]+"' data-id='"+docs[i]+"'type='checkbox'>" + "<div class='checktitle-container' data-id="+docs[i]+">" + conditional_clip(title, 30) + " (<span class='t1'>" + ((csv_data[docs[i]][reverse_topic_indices[source]])*100).toFixed(2) + "%</span> and <span class='t2'>" + ((csv_data[docs[i]][reverse_topic_indices[target]])*100).toFixed(2) + "%</span>)</div>";
        }
        callback(result);
    });
}

//remove all traces of the corpus view from existence
function corpusCleanup()
{
    d3.select(".tooltip").style("visibility", "hidden");
    d3.select("#corpus-svg").remove();
    d3.select(".info-box").remove();
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


