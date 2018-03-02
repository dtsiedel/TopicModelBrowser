var chart;
var margin;
var width;
var height;
var radius;
var tooltip;
var selected = [];
var dragSelecting = false;


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

    var total = 0.0;
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
            if((current[j] <= corpus_threshold) && (i !== j)) //show all topics at least once (don't apply thresh to self links)
            {
                current[j] = 0;
            }  
            else
            {
                current[j] = current[j] * (r / s);
            }
            current[j] /= max;  //scale so it renders appropriately
            total += current[j];
        }
    }

    for(var i = 0; i < matrix.length; i++)
    {
        var current = matrix[i]; 
        for(var j = 0; j < current.length; j++)
        {
            current[j] *= (10/total);
        }
    }
}

//determine what shell the ith
//flag should be on
function get_shell(shell_count, index)
{
    return shell_count - (index % shell_count) - 1; 
}

//make the corpus view, incuding arcs and ribbons
//mode = "simple" or "regular"
function constructCorpus()
{
    //var processed = processData(csv);   //don't do this anymore, since it is done offline

    var matrix = ribbon_counts; 
    var n_topics = matrix.length;
    process(matrix); 

    var corpus_shrink_factor = 0;
    if(corpus_style === "simple")
    {
        corpus_shrink_factor = 100;
    }

    var width = 600,
        height = 600,
        outerRadius = Math.min(width, height) / 2 - corpus_shrink_factor,
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
    
    var shells = [];
    var shell_circumferences = []; 
    var shell_radii = [];
    var offset = 5; //base offset (distance from the outer edge of corpus)
    var shell_count = 6;

    for(var i = 0; i < shell_count; i++)
    {
        var radius = outerRadius + offset; 

        shell_circumferences[i] = 2 * Math.PI * radius;
        shell_radii[i] = radius;
        offset += 20;
    }

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
            goTo(pages.corpus, pages.topic, [d.index, 1]);
        })
        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
        .on("mousemove", function(d){
            var topic_text = reverse_topic_indices[d.index];
            var index = d.index; 
            var value = d.value / parseFloat(100); 
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_tooltip_html(index, topic_text, value*10.0)).style("background-color", colors[index]).style("color", "white");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
        .style("fill", function(d) { return getColor(d.index % n_topics); });
        

    // Add a text label.
    var groupText = group.append("text");
     
    //position appropriately around the circle
    var corpus_center = {"x": width/2, "y": height/2+corpus_shrink_factor/2}; //true center
    var positions = [];
    var box_height = 100;
    var box_width = 100;
    var box_diagonal = Math.sqrt(Math.pow(box_height, 2) + Math.pow(box_width, 2)) / 2;
    positions.push({"x": corpus_center.x,"y": corpus_center.y - outerRadius - box_height});
    positions.push({"x": corpus_center.x + outerRadius, "y": corpus_center.y - outerRadius});
    positions.push({"x": corpus_center.x + outerRadius + box_width/3, "y": corpus_center.y});
    positions.push({"x": corpus_center.x + outerRadius * .8, "y": corpus_center.y + outerRadius * .8});
    positions.push({"x": corpus_center.x, "y": corpus_center.y + outerRadius * 1.1});
    positions.push({"x": corpus_center.x - outerRadius * .95, "y": corpus_center.y + outerRadius * .95});
    positions.push({"x": corpus_center.x - outerRadius - box_width, "y": corpus_center.y});
    positions.push({"x": corpus_center.x - outerRadius * 1.2, "y": corpus_center.y - outerRadius * 1.2});

    var desired = [0, 1.0/8, 2.0/8, 3.0/8, 4.0/8, 5.0/8, 6.0/8, 7.0/8];
    var desired_index = 0;

    var found = [];

    var running = 0.0;
    groupText.append("textPath")
        .attr("xlink:href", function(d, i) 
        { 
            var offset = running;
            var shell_n = get_shell(shell_count, i);

            var r = shell_radii[shell_n];
            var start = running * 2 * Math.PI;

            var shell = d3.svg.arc()
                .startAngle(start)
                .endAngle(start + (2 * Math.PI) - .0001) 
                .innerRadius(r)
                .outerRadius(r + 1);

            if((running >= desired[desired_index]) || (running+d.value/10 >= desired[desired_index]))
            {
                found.push(d.index);
                desired_index++;
            }

            running += d.value/10;
            offset = offset * shell_circumferences[shell_n]; 

            return "#shell" + i; 
        }) 
        .attr("class", function(d, i) { return "textpath" + i; })
        .style("fill", function(d, i) { return colors[d.index]; })
        .text(function(d, i) 
        {
            var words = reverse_topic_indices[d.index];
            return "Topic " + d.index; 
        });

    if(corpus_style === "simple")
    {
        //put on each of the cardinal and semi-cardinal labels
        for(var i = 0; i < positions.length; i++)
        {
            var topic_n = found[i];
            var this_flag = d3.select("body")
                .append("div")
                .attr("class", "corpus-flag " + "flag"+topic_n)
                .style("position", "absolute")
                .style("width", box_width)
                .style("height", box_height)
                .style("background-color", colors[topic_n])
                .style("padding-left", "5px")
                .style("z-topic_n", "5") //put it in front of the arcs but behind regular tooltip
                .style("border-radius", "10px")
                .html(generate_flag_html(topic_n)); 
            
            this_flag.style("left", positions[i].x).style("top", positions[i].y);

            var point1 = positions[i];
            positions[i].x -= corpus_center.x
            positions[i].y -= corpus_center.y
            var selection = d3.select("#group"+topic_n).node();
            var location2 = selection.getPointAtLength(selection.getTotalLength()/2);
            var point2 = {"x": location2.x, "y": location2.y};

            //draw the line
            var lineData = [point1, point2];
            var lineFunction = d3.svg.line()
                .x(function (d) {
                    return d.x;
                })
                .y(function (d) {
                    return d.y;
                })
                .interpolate("linear");

            svg.append("path")
                .attr("d", lineFunction(lineData))
                .style("stroke-width", 1)
                .style("stroke", colors[topic_n])
                .on("mouseover", function () 
                {
                    d3.select(this).style("stroke-width", 2);
                })
                .on("mouseout", function () 
                {
                    d3.select(this).style("stroke-width", 1);
                });
        } 
    }
     
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
            d3.select("#topic_single").on("click", function() {
                goTo(pages.corpus, pages.topic, [d.source.index, 1]);
            });
        });
    }

    function mouseover(d, i) {
        chord.classed("fade", function(p) {
            return p.source.index !== i && p.target.index !== i;
        });
    }
    d3.select("#header").append("button").attr("id", "corpus-toggle").text("Toggle Corpus Flags").on("click", function() {
        if(corpus_style === "simple")
            corpus_style = "regular"; 
        else
            corpus_style = "simple";
        goTo(pages.corpus, pages.corpus, []);
    });
}

function apply_chord_fade(source, target, i)
{
    return source !== i && target !== i;
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
    if(source === target)
    {
        var result = "<span class='t1 title'>Topic " + source + "</span><br/>";
        var words = reverse_topic_indices[source]
	result += "<button class='corpus-button' id='document_compare' type='button'>Compare selected documents!</button>";
    	result += "<button class='corpus-button' id='document_single' type='button'>View single document!</button><br/>";
        result += "<button class='corpus-button' id='topic_single' type='button'>Learn about this topic!</button><br/>";
        var docs = ribbon_data[source][source];

	docs = sortRibbon(docs, source, source);
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
		result += "<input class='checkBox check"+docs[i]+"' data-id='"+docs[i]+"'type='checkbox'>" + "<div class='checktitle-container' data-id="+docs[i]+">" + conditional_clip(title, 30) + " (<span class='t1'>" + ((csv_data[docs[i]][reverse_topic_indices[source]])*100).toFixed(2) + "%</span>)</div>";
	    }
	    callback(result);
	}); 

        callback(result); //actually put it onto the DOM
        return;
    }

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
    d3.selectAll(".corpus-flag").remove();
    d3.select("#corpus-toggle").remove();
    d3.select("#corpus-svg").remove();
    d3.select(".info-box").remove();
}



