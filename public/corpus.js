var chart;
var margin;
var width;
var height;
var radius;
var tooltip;
var selected = [];
var selected_topics = "~"; //sentinel value
var cardinal_topics = {}; //state of all cardinal flags (map to true = visible)
var dragSelecting = false;
//what does the topic selector look like when hidden? 
var compressed_topic_selector_html = "<div class='compressed_topic_selector'><span class='flag_title'>Topic Selector (Click to Expand)</span></div>"; 

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

//array subtraction
Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

//add all topics to the seletion
function toggle_all_topics_on()
{
    for(var i = 0; i < n_topics; i++)
    {
        if(!(selected_topics.includes(i.toString())))
        {
            toggle_topic_checkbox(i.toString());
            visually_toggle_t(i.toString()); 
        }
    }
}

//remove all topics from the selection
function toggle_all_topics_off()
{
    for(var i = 0; i < n_topics; i++)
    {
        if(selected_topics.includes(i.toString()))
        {
            toggle_topic_checkbox(i.toString());
            visually_toggle_t(i.toString()); 
        }
    }
}

//compresses the topic selector to be a short, wide clickable
function compress_topic_selector(new_html)
{
    var stored_selector = d3.select(".topic_selector").html();
    d3.select(".topic_selector").html(new_html).style("height", "5%");
    d3.select(".compressed_topic_selector").on("click", function() { expand_topic_selector(stored_selector); });
    d3.select(".ribbon_selector").style("height", "95%");
}

//un-compress the topic selector to the stored html
function expand_topic_selector(stored)
{
    d3.select(".topic_selector").html(stored).style("height", "40%");
    d3.select(".ribbon_selector").style("height", "60%");
    set_topic_selector_handlers();
}

//need to be able to reset all of these when the html of the topic selector changes
function set_topic_selector_handlers()
{
    d3.selectAll(".topic_check").on("click", function() { toggle_topic_checkbox(d3.select(this).attr("data-id")); });
    d3.selectAll(".t_checktitle_container").on("click", function(d,i) 
    {
        var id = d3.select(this).attr("data-id");
        visually_toggle_t(id.toString());
        toggle_topic_checkbox(id.toString());  
    });

    //set up button listeners
    d3.select(".show_all_button").on("click", function() 
    {
        toggle_all_topics_on();
    });
    d3.select(".show_none_button").on("click", function() 
    {
        toggle_all_topics_off();
    });
    d3.select(".show_cardinal_button").on("click", function()
    {
        toggle_all_topics_off();
        var indices = Object.keys(cardinal_topics).map(x => parseInt(x));
        for(var i = 0; i < indices.length; i++)
        {
            toggle_topic_checkbox(indices[i]);
            visually_toggle_t(indices[i]); 
        }
    });
}

//make the corpus view, incuding arcs and ribbons
//mode = "simple" or "regular"
function constructCorpus()
{
    //var processed = processData(csv);   //don't do this anymore, since it is done offline

    var matrix = ribbon_counts; 
    n_topics = matrix.length;
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

    var defs = svg.append('defs'); //holds attributes of corpus, including the color gradients for the chords
    
    var sidebar = d3.select("body").append("div")
        .attr("class", "sidebar");
    
    var topic_selector = d3.select(".sidebar").append("div")
        .attr("class", "topic_selector")
        .text("Check which topics you want to see.");



    var info = d3.select(".sidebar").append("div")
        .attr("class", "ribbon_selector")
        .html("</br>Click a chord to see the documents joining those two topics!");
         
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
     
    // The physical representation of each "group"
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

    //corpus flag locations for simple view. There isn't really a clean way to hard code these 8 values
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
    groupText.append("textPath").attr("xlink:href", function(d, i) 
    { 
        if((running >= desired[desired_index]) || (running+d.value/10 >= desired[desired_index]))
        {
            found.push(d.index);
            desired_index++;
        }

        running += d.value/10;

        return "#shell" + i; 
    }) 

    if(selected_topics === "~") //indicates nothing has been selected
    {
        selected_topics = found.slice().map(function(e) { return e.toString() });
        var temp = selected_topics.slice();
        for(var i = 0; i < temp.length; i++)
        {
            cardinal_topics[temp[i]] = true;
        }
    }

    topic_selector.html(generate_topic_checkboxes(Object.keys(topic_indices), selected_topics));
    set_topic_selector_handlers();

    groupPath.attr("class", function(d,i) 
    { 
        if(!(selected_topics.includes(i.toString()))) 
        {
            return "path partial-fade"; 
        }
        return "path";
    })

    


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
                .style("opacity", function() 
                { 
                    if(cardinal_topics[topic_n]) { return 1; }
                    else                   { return 0; }
                })
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
                .attr("class", "line"+topic_n)
                .style("stroke-width", 1)
                .style("stroke", colors[topic_n])
                .style("opacity", function() 
                { 
                    if(cardinal_topics[topic_n]) return 1;
                    else                   return 0;
                })
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
        .attr("class", function(d, i) { 
            if(!(selected_topics.includes(d.source.index.toString()) && selected_topics.includes(d.target.index.toString())))
                return "partial-fade chord";
            return "chord";
        })
        .style("stroke", "white") 
        .style("fill", function(d) { return "url(#linear-gradient" + d.source.index + "-" + d.target.index + ")";})
        .on("click", chordselected)
        .attr("d", path);
        
    //hide all chords besides those that belong to hovered 
    function chordselected(d) {
        generate_document_info(d.source.index, d.target.index, function(result)
        {
            text = "<br/>"+result;
            selected = []; //need to reset this between chord clicks
            info.html(text);
            d3.selectAll(".checkbox").on("click", function() { toggle_corpus_checkbox(d3.select(this).attr("data-id")); });
            d3.selectAll(".checktitle-container").on("mousedown", function() {
                dragSelecting = true;
                var current = d3.select(this).attr("data-id");
                visually_toggle(current); 
                toggle_corpus_checkbox(current);
            });
            d3.selectAll(".checktitle-container").on("mouseover", function() {
                if(dragSelecting){
                    var current = d3.select(this).attr("data-id");
                    visually_toggle(current);
                    toggle_corpus_checkbox(current);
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
        compress_topic_selector(compressed_topic_selector_html);
    }

    function mouseover(d, i) {
        chord.classed("fade", function(p) {
            return p.source.index !== i && p.target.index !== i;
        });
    }

    var toggle_corpus = d3.select("#header").append("button").attr("id", "corpus-toggle").on("click", function() {
        if(corpus_style === "simple")
            corpus_style = "regular"; 
        else
            corpus_style = "simple";
        goTo(pages.corpus, pages.corpus, []);
    });
    if(corpus_style === "simple")
        toggle_corpus.text("Switch to Advanced View");
    else
        toggle_corpus.text("Switch to Simplified View");
        
}

function apply_chord_fade(source, target, i)
{
    return source !== i && target !== i;
}

//change the appearance of checkbox when clicking title
function visually_toggle(index)
{
    var element = d3.selectAll(".c_check"+index);
    if(element.property("checked"))
        element.property("checked",false);
    else
        element.property("checked",true);
}

//change the appearance of checkbox when clicking topic
function visually_toggle_t(index)
{
    var element = d3.selectAll(".t_check"+index);
    if(element.property("checked"))
        element.property("checked",false);
    else
        element.property("checked",true);

}

//handle checkbox state for topic checkboxes
function toggle_topic_checkbox(id)
{
    if(selected_topics.includes(id))
    {
        selected_topics.splice(selected_topics.indexOf(id), 1);
    }
    else
    {
        selected_topics.push(id.toString());
    }

    d3.selectAll(".path").attr("class", function(d, i) {
        if(selected_topics.includes(i.toString())) return "path";
        return "path partial-fade";
    });
    d3.selectAll(".chord").attr("class", function(d, i) 
    {
        if((selected_topics.includes(d.source.index.toString())) && (selected_topics.includes(d.target.index.toString())))
        {
            return "chord";
        }
        return "chord partial-fade";
    }).style("stroke", gray).style("stroke-width", .05); //unsure why we have to reset the style


    //and check if you toggled a cardinal element (to toggle its flag)
    if(Object.keys(cardinal_topics).includes(id.toString()))
    {
        cardinal_topics[id.toString()] = !cardinal_topics[id.toString()];
        if(!cardinal_topics[id.toString()]) //toggle to off
        {
            d3.select(".flag"+id).style("opacity", 0);
            d3.select(".line"+id).style("opacity", 0);
        }
        else
        {
            d3.select(".flag"+id).style("opacity", 1);
            d3.select(".line"+id).style("opacity", 1);
        }
    }
}


//handle checkbox state for corpus checkboxes
function toggle_corpus_checkbox(id)
{
    //to translate javascript: if the id is in the list, remove it. Else add it. AKA toggle existence in list
    if(selected.includes(id))
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
		result += "<input class='checkBox c_check"+docs[i]+"' data-id='"+docs[i]+"'type='checkbox'>" + "<div class='checktitle-container' data-id="+docs[i]+">" + conditional_clip(title, 30) + " (<span class='t1'>" + ((csv_data[docs[i]][reverse_topic_indices[source]])*100).toFixed(2) + "%</span>)</div>";
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
            result += "<input class='checkBox c_check"+docs[i]+"' data-id='"+docs[i]+"'type='checkbox'>" + "<div class='checktitle-container' data-id="+docs[i]+">" + conditional_clip(title, 30) + " (<span class='t1'>" + ((csv_data[docs[i]][reverse_topic_indices[source]])*100).toFixed(2) + "%</span> and <span class='t2'>" + ((csv_data[docs[i]][reverse_topic_indices[target]])*100).toFixed(2) + "%</span>)</div>";
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
    d3.select(".sidebar").remove();
}



