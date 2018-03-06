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
function constructCorpus(csv)
{
    document.title = "Corpus Overview";
    //var processed = processData(csv);   //don't do this anymore, since it is done offline

    var matrix = ribbon_counts; 
    var n_topics = matrix.length;
    process(matrix); 

    var width = 600,
        height = 600,
        outerRadius = Math.min(width, height) / 2 - 150,
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
    var offset = 5; //base offset
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
    var running = 0.0;
    groupText.append("textPath")
        .attr("xlink:href", function(d, i) { 
            var offset = running;
            var shell_n = get_shell(shell_count, i);

            var r = shell_radii[shell_n];
            var start = running * 2 * Math.PI;

            var shell = d3.svg.arc()
                .startAngle(start)
                .endAngle(start + (2 * Math.PI) - .0001) 
                .innerRadius(r)
                .outerRadius(r + 1);

            shells[i] = svg.append("path").attr("d", shell).attr("fill", "none").attr("id", "shell" + i);

            running += d.value/10;
            offset = offset * shell_circumferences[shell_n]; 

            return "#shell" + i; 
        }) 
        .attr("class", function(d, i) { return "textpath" + i; })
        .style("fill", function(d, i) { return colors[d.index]; })
        .text(function(d, i) {
            var words = reverse_topic_indices[d.index];
            return conditional_clip(commas(words), 5); 
        })
        .on("mouseover", function(d, i)  //shade out the other flags, and extend this one
        {
            var current = d3.select(".textpath"+i);
            var current_index = d.index;
            current.text(function(d, i) 
            {
                var words = reverse_topic_indices[d.index];
                words = commas(words);
                return words; 
            });
            d3.selectAll("textPath").each(function(d) 
            {
                if(d.index !== current_index)
                {
                    d3.select(this).style("opacity", 0);         
                }
            });
        })
        .on("mouseout", function(d, i)  //reset all flags on mouseout
        {
            var current = d3.select(".textpath"+i);
            current.text(function(d, i)
            {
                var words = reverse_topic_indices[d.index];
                words = commas(words);
                return conditional_clip(words, 5); 
            });
            d3.selectAll("textPath").each(function(d) 
            {
                d3.select(this).style("opacity", 1);
            });
        });
     
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
    d3.select("#corpus-svg").remove();
    d3.select(".info-box").remove();
}


window.addEventListener( "pageshow", function ( event ) {
    if(!!window.performance && window.performance.navigation.type == 2)
    {
        window.location.reload();
    }
  });



