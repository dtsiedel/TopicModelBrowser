//Includes functions used by multiple views, to avoid duplication

var threshold = 0.05; //how high must a topic be to be included?
var corpus_threshold = 750; //how many documents must be shared for the link to be in the corpus view?
var chord_threshold = 500; //how many related docs should be shown in info box per chord?
var cosineThreshold = 0.85; //threshold for force-directed graph for multiple documents
var colors = ["#1CE6FF", "#FF34FF", "#FF4A46", "#008941", "#006FA6", "#A30059",
        "#FFDBE5", "#7A4900", "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87",
        "#5A0007", "#809693", "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
        "#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9", "#B903AA", "#D16100",
        "#7B4F4B", "#A1C299", "#300018", "#0AA6D8", "#013349", "#00846F",
        "#FFB500", "#A079BF", "#CC0744", "#C0B9B2", 
        "#00489C", "#6F0062", "#0CBD66", "#EEC3FF", "#456D75", "#B77B68", "#7A87A1", "#788D66",
        "#885578", "#FAD09F", "#FF8A9A", "#D157A0", "#BEC459", "#456648", "#0086ED", "#886F4C",
        "#34362D", "#B4A8BD", "#00A6AA", "#452C2C", "#636375", "#A3C8C9", "#FF913F", "#938A81",
        "#575329", "#00FECF", "#B05B6F", "#8CD0FF", "#3B9700", "#04F757", "#C8A1A1", "#1E6E00",
        "#7900D7", "#A77500", "#6367A9", "#A05837", "#6B002C", "#772600", "#D790FF", "#9B9700",
        "#549E79", "#201625", "#72418F", "#BC23FF", "#99ADC0", "#3A2465", "#922329",
        "#5B4534", "#404E55", "#0089A3", "#CB7E98", "#A4E804", "#324E72", "#6A3A4C",
        "#83AB58", "#001C1E", "#004B28", "#C8D0F6", "#A3A489", "#806C66", "#222800",
        "#BF5650", "#E83000", "#66796D", "#DA007C", "#FF1A59", "#8ADBB4", "#1E0200", "#5B4E51",
        "#C895C5", "#320033", "#FF6832", "#66E1D3", "#CFCDAC", "#D0AC94", "#7ED379", "#012C58"];
var pages = {"corpus":0, "donut":1, "topic":2, "bars":3, "nodes":4, "spectrum":5, "agg_single":6}; //enum for which page to go to
var loaded_data = false; //flag to prevent reload on corpus reload
var total_t_d_links = 0; //need this to compute proportions of topic relevance
var color_map = {};
var filteredData;
var csv_data = [];
var topic_indices = {}; 
var topic_words = {};
var reverse_topic_indices = {};
var gray = "#d3d3d3";
var ribbon_data;
var ribbon_counts;
var n_topics;
var document_text = {};
var aggregate_data = [];
var call_stack = [];
var current_params = [];
var dropdown;
var dropdown_agg;

document.addEventListener("DOMContentLoaded", function(e) {
    console.log("loaded libary");
});

//random one of our colors
function randomColor()
{
    return colors[Math.floor(Math.random()*colors.length)];
}

//gives a random index in the range of our documents
function randomDocument()
{   
    return Math.floor(Math.random()*csv_data.length);
}

//gives a random index in the range of our topics
function randomTopic()
{   
    return Math.floor(Math.random()*ribbon_data.length);
}

//filter out topics that are less than thresh or invalid
function filter(topic_array)
{
    var filtered = [];
    var total = 0; //total should add to one, need this to see total of "other"
    var count = 1;
    
    var not_topics = [0, "", "Group.1", "X", "link", "blog_domain"];

    for(key in topic_array)
    {
        if(not_topics.indexOf(key) > 0) //TODO: bit of a hack, needs to be sorted out for other metadata
        {
            continue
        }
        if(topic_array[key] < threshold)
        {
            count++; //still increment count since we want absolute index in csv, not just in this list
            continue
        }
        var val = topic_array[key];
        var newEntry = {};
        newEntry["index"] = topic_indices[key];
        newEntry["topic"] = key;
        newEntry["value"] = parseFloat(val);
        newEntry["color"] = getColor(topic_indices[key]);
        filtered.push(newEntry);
        total += parseFloat(val);
        count++;
    }
    var other = {};
    other["index"] = '~';
    other["topic"] = "other";
    other["value"] = 1 - total;
    other["color"] = gray;
    filtered.push(other);
    return filtered;
}

//probably not necessary anymore
function getColor(n)
{
    return colors[n];
}

//make text + ellipses no longer than n
function clip(text, n)
{
    if(text.length > n)
    {
        return text.slice(0,n-4) + "...";
    }
    return text
}

//add document excerpt to donut view
function addExcerpt(chart, text)
{
    var excerpt = chart.selectAll(".excerpt")
        .data(text)
        .enter()
        .append("text")
        .attr("class", "excerpt")
        .style("fill", "white")
        .text(conditional_clip(text, 50))
        .attr('transform', function(d, i) {
            var horz = 200;
            var vert = 150; 
            return 'translate(' + horz + ',' + vert + ')';
        });
}

//put a legend onto chart
function addLegend(chart, data, legendRectSize, legendSpacing, current_page)
{
    var offset = 6; //need to shift text down a little

    var legend = chart.selectAll('.legend')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', function(d, i) {
        var height = legendRectSize + legendSpacing;
        var offset =  height * 10 / 2;
        var horz = -2 * legendRectSize + 1.5*radius;
        var vert = i * height - offset * 1.15;
        return 'translate(' + horz + ',' + vert + ')';
      });

      //add in colored rectangle
    legend.append('rect')
        .attr('width', legendRectSize)
        .attr('height', legendRectSize)
        .style('fill', function(d){return d.color})
        .style('stroke', "gray")
        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
        .on("mousemove", function(d){
            var topic_text = d.topic;
            var index = d.index
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_tooltip_html(index, topic_text, d.value)).style("background-color", d.color).style("color", "white");})
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
        .on("click", function(d,i) {
            if(d.index !== "~")
            {
                goTo(current_page, pages.topic, [d.index, 1]);
            }
        });

    legend.append('text')
        .attr("class", "donut_legend_text")
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', legendRectSize - legendSpacing + offset)
        .style("fill", "white")
        .text(function(d) { return clip(commas(d.topic),70); });
   
    make_clickable("rect");
}



//replace all instances of _ with , for topic display
function commas(text)
{
    return text.replace(/_/g, ", "); 
}

//create the html element that the tooltip resides in
function generate_document_tooltip(id)
{
    var data = document_text[id];
    var result = "<div>";
    result += conditional_clip(data["title"], 30) + "<br/>";
    result += "Excerpt: </br>";
    result += clip(data["text"], 350);

    result += "</div>";

    return result;
}

//make the sidebar with the list of topics
function generate_topic_checkboxes(topics, selected)
{
    var result = "<span class='flag_title'>Topic Selector</span><br/>"
    result += "<button class='show_all_button'>Show All</button>";
    result += "<button class='show_none_button'>Show None</button>";
    result += "<button class='show_cardinal_button'>Show Cardinal</button>";

    result += "<br/>";
    for(var i = 0; i < topics.length; i++)
    {
        var current = topics[i];
        result += "<input type='checkbox' class='topic_check t_check" + i + "' data-id='" + i + "'";
        if(selected.includes(i.toString())) result += "checked";
        result += "></input>";
        result += "<span class='t_checktitle_container' data-id='" + i + "'>";
        result += "<span class='t_span' style='color: " + colors[i] + "'>"
        result += "Topic " + i + " (";
        result += conditional_clip(reverse_topic_indices[i].replace(/_/g, ", "), 45);
        result += ")</span></span><br/>";
    }

    return result;
}

//text formatting for corpus flag tooltips
function generate_flag_html(index)
{
    var topic_words = reverse_topic_indices[index].replace(/_/g, "<br>");
    var text = "";
    text += "<span class='flag_title'>Topic " + index + ": ";
    text += "<br></span>";
    text += topic_words;
    return text;
}

//lookup to get a pretty string for an enum number
function prettify_one_entry(entry)
{
    var num = entry[0];
    var second_part = entry[1];    

    var result = "";

    switch(num)
    {
        case 1: 
            result += "Single Doc: ";
            result += second_part; 
            break;
        case 2: 
            result += "Single Topic: ";
            result += second_part[0] + " Page " + second_part[1];
            break;
        case 3:
            result += "Two Docs: ";
            result += second_part[0] + " and " + second_part[1];
            break;
        case 4:
            result += "Multiple Docs: ";
            for(var i = 0; i < second_part.length; i++)
            {
                result += second_part[i] + ", ";
            }
            result = result.substring(0, result.length - 2);
            break;
        case 5:
            result += "Two Topics: ";
            result += second_part[0] + " and " + second_part[1];
            break;
        case 6:
            result += "Aggregate: " + aggregate_data[second_part]["Group.1"];
            break;
        default:
            result += "Error Page: ";
            break;
    }

    return conditional_clip(result, 35);
}

//prettify a call stack entry into a string
function prettify_call_stack_entry(entry)
{
    var result = "";
    if(entry[0] === 0)
    {
        return "Corpus View";
    }

    if(entry.length === 2)
    {
        result += prettify_one_entry(entry);
        result += "<br>";
    }

    return result;
}

//convert the call stack into a visual representation
function generate_dropdown_html()
{
    var result = "";
    for(var i = call_stack.length - 1; i >= 0; i--)
    {
        result += "<div class='dropdown-element' data-number='" + (call_stack.length - i);
        result += "' data-one='" + call_stack[i][0] + "' data-two='" + call_stack[i][1] + "'>";
        var current = call_stack[i];
        result += prettify_call_stack_entry(current);
        result += "</div>";
    } 
    return result;
}

//make a list of all available aggregates
function generate_dropdown_aggregate_html()
{
    var result = "";
    for(var i = 0; i < aggregate_data.length; i++)
    {
        result += "<div class='dropdown-element' data-number='" + i;
        result += "'>";
        result += conditional_clip(aggregate_data[i]["Group.1"], 35);
        result += "</div>";
    } 
    return result;
}

//does all the text formatting for the tooltip
function generate_tooltip_html(topic_number, topic_name, percentage)
{
    topic_words = topic_name.split("_");
    var text = "<div>";
    if(topic_number === "~") //other
    {
        text += "Other";
    }
    else
    {
        text += "T" + topic_number;
    }
    text +=  " (" + (percentage*100).toFixed(2) + "%)" + "<br>Sample Words:<br>";
    for(var i = 0; i < topic_words.length; i++)
    {
        text += topic_words[i];
        text += "<br>"
    }
    text += "</div>";
    return text;
}

//initialize mapping of topic names to index
//by just assigning them in a row
function getTopicIndices(func)
{
    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        csv_data = rectify_csv_data(csv_data);
        var count = 0;
        for(var i=0;i<csv_data.length;i++)
        {
            var current = csv_data[i];
            for(key in current)
            {
                if(key.length !== 0)
                {
                    if(!(key in topic_indices))
                    {
                        topic_indices[key] = count;
                        reverse_topic_indices[count] = key;
                        count++;
                    }
                }
            }
        } 
 
        getRibbonCounts(function()
        {
            getRibbonData(function()
            {
                func();
            });
        });
    });
}
    
//why do I have to write array intersection code myself in $currentYear?
function intersect(l1, l2)
{
    var result = [];
    for(var i = 0; i < l1.length; i++)
    {
        for(var j = 0; j < l2.length; j++)
        {
            if(l1[i] === l2[j])
            {
                result.push(l1[i]);
            }
        }
    }
    return result;
}

//what the hell javascript
function Array2D(x, y)
{
    var array2D = new Array(x);

    for(var i = 0; i < array2D.length; i++)
    {
        array2D[i] = new Array(y);
    }

    return array2D;
}

//generate the list of topic-pair documents for ribbons
//based on the list of dicts of topic:relevant documents
function generateRibbonData(data)
{
    ribbonCounts = Array2D(data.length, data.length);
    ribbonData = Array2D(data.length, data.length);

    for(var i = 0; i < data.length; i++)
    {
        for(var j = i; j < data.length; j++)
        {
            if(i === j) //all are shared in the diagonal matrix
            {
                var t = data[i];
                var l = t[Object.keys(t)[0]];
                ribbonCounts[i][i] = l.length;
                ribbonData[i][i] = l; //probably don't need to know that a topic shares everything with itself, but need this for later
            }
            else
            {
                var t1 = data[i];
                var t2 = data[j];
                var l1 = t1[Object.keys(t1)[0]];
                var l2 = t2[Object.keys(t2)[0]];
                var name1 = Object.keys(t1)[0];
                var name2 = Object.keys(t2)[0];
                var shared = intersect(l1, l2); 
                ribbonData[i][j] = shared;
                ribbonData[j][i] = shared;
                ribbonCounts[i][j] = shared.length;  
                ribbonCounts[j][i] = shared.length;
            }
        }
    }
    console.log(ribbonData);
    console.log(ribbonCounts);
}

//fill our ribbonCounts array by pulling the cached version on the
//server instead of computing it ourselves with the heavy methods above
function getRibbonCounts(func)
{
    //fetch csv
    //in callback: should just be able to get it with d3.csv
    d3.text("/ribbon_counts.csv", function(error, response) {
        ribbon_counts = response; 
        var lines = ribbon_counts.split("\n");
        lines.splice(-1,1); //remove last (extra) one. js is dumb

        ribbon_counts = [];
        for(var i = 0; i < lines.length; i++)
        {
            var numbers = lines[i].split(",");
            numbers.splice(1,-1);
            ribbon_counts.push(numbers);
        }

        func();
    });
}

//same as getRibbonCounts but a little tougher
function getRibbonData(func)
{
    //split on \n to get 50 arrays 
    //for each, split on | to get 50 arrays each
    //each of those can be split on , to get the elements inside
    //make one big 50x50 array where the contents of each element is gained by the comma split 
    d3.text("/ribbon_data.txt", function(error, response) {
        ribbon_data = response;
        var lines = ribbon_data.split("\n");
        lines.splice(-1,1); //two stragglers on this split, remove them

        ribbon_data = [];
        for(var i = 0; i < lines.length; i++)
        {
            var arrays = lines[i].split("|"); //divider for each array in a line
            ribbon_data.push([]);

            for(var j = 0; j < arrays.length; j++)
            {
                var numbers = arrays[j].split(",");
                ribbon_data[i][j] = numbers;
                total_t_d_links += numbers.length;
            }
        }

        func();
    });
}

//was used to generate the output for ribbon_counts.csv
//just did it in the console because you can't write to files
//on the client side
function stringifyRibbonCounts(array)
{
    var result = "";
    for(var i = 0; i < array.length; i++)
    {
        var current = array[i];
        for(var j = 0; j < current.length; j++)
        {
            result += current[j] + ","
        }
        result = result.substring(0, result.length - 1);
        result += "\n";
    }
    return result;
}

//was used to generate the output for ribbon_documents.txt
//use it the same way as the previous function stringifyRibbonCounts
//has to be different because this one is a 2d array where each elements is an array of numbers
function stringifyRibbonData(array)
{
    var result = ""; 
    for(var i = 0; i < array.length; i++)
    {
        var current = array[i];
        for(var j = 0; j < current.length; j++)
        {
            var list = current[j];
            var temp = "";
            for(var z = 0; z < list.length; z++)
            {
                temp += list[z];
                temp += ",";
            }
            temp = temp.substring(0, temp.length - 1); 
            temp += "|";
            result += temp;
        }
        result = result.substring(0, result.length - 1);
        result += "\n";
    }
    return result;
}

//stupid 1 indexing when coming from csv
function rectify_csv_data(csv_data)
{
    for(var i = 0; i < csv_data.length; i++)
    {
        csv_data[i][""] = csv_data[i][""] - 1;
    }
    return csv_data;
}

//clip for use when you need to fit a certain amount of space
//since we are not using a fixed width font
function conditional_clip(string, n)
{
    if(string.length === 0)
    {
        return "Untitled";
    }
    var cost = 0;
    string = string.trim();
    result = "";
    for(var i = 0; i < string.length; i++)
    {
        var current = string.charAt(i);
        result += current;
        if(current == current.toUpperCase() && current != " ") //I HATE Javascript sometimes
        {
            cost += 1.5;
        } 
        else
        {
            cost++;
        }
        if(cost > n)
        {
            result = result.slice(0, -3);
            result += "...";
            return result;
        }
    }
    return result;
}


//once executed, document_text should be a dictionary with the following layout:
//{document_number: {date:*date*, text:*text*, url:*url*, title:*title*}
//so to get the title of the document with id 3 you would use document_text[3]["title"]
function get_document_full_texts(callback)
{
    d3.json("/filtered_merged_file.json", function(error, response)
    {
        var temp = response;
        var count = 0;
        
        for(var i = 0; i < temp.length; i++)
        {
            var current = temp[i];
            for(var j = 0; j < current.length; j++)
            {
                var this_doc = current[j]; 
                var data = {};
                data.date = this_doc["date"];
                data.text = this_doc["body"];
                data.url = this_doc["link"];
                data.title = this_doc["title"];
                document_text[count] = data;
                count++;
            }
        }
        
        callback();
    });
}

//fetch stopwords file
function get_stopwords(callback)
{
    d3.text("/stopwords.txt", function(error, response)
    {
        stopwords = response.split(",");
        callback();
    });
}

//for the back button
function returnToCorpus()
{
    window.location.href = "/corpus"
}

//sort the documents belonging to given ribbon
function sortRibbon(documents, t1, t2)
{
    var temp = [];
    var t1 = reverse_topic_indices[t1];
    var t2 = reverse_topic_indices[t2];
    for(var i = 0; i < documents.length; i++)
    {
        temp.push([documents[i], parseFloat(csv_data[documents[i]][t1])+parseFloat(csv_data[documents[i]][t2])]);
    } 
    temp.sort(function(x,y){return y[1]-x[1]}); 
    var result = [];
    for(var i = 0; i < temp.length; i++)
    {
        result.push(temp[i][0]);
    }
    return result;
}

//transition state machine for going to various pages
function goTo(source, target, parameters, returning=false)
{
    if(!returning)
    {
        call_stack.push([source, current_params]);
    } 

    d3.select(".dropdown-back").style("visibility", "hidden"); 
    d3.select(".dropdown-agg").style("visibility", "hidden"); 

    current_params = parameters;
    switch(source)
    {
        case pages.corpus:
            corpusCleanup();
            break;
        case pages.donut:
            donutCleanup();
            break;
        case pages.topic:
            topicCleanup();
            break;
        case pages.bars:
            barsCleanup();
            break;
        case pages.nodes:
            nodesCleanup();
            break;
        case pages.spectrum:
            spectrumCleanup();
            break;
        case pages.agg_single:
            agg_singleCleanup();
            break;
    }

    switch(target)
    {
        case pages.corpus:
            window.location.hash = '';
            main(parameters);
            break;
        case pages.donut:
	    window.location.hash = '#d' + parameters;
            donutMain(parameters);
            break;
        case pages.topic:
            //add the topic number and the page number (always will be 1 here when entering from another page)
            window.location.hash = '#t' + parameters[0] + '#p' + '1';
            topicMain(parameters);
            break;
        case pages.bars:
	    var hash = '#b';
            for(i = 0; i < parameters.length; i++) {
                hash +=parameters[i];
                hash += "&";
            }
            window.location.hash = hash.slice(0, -1);
            barsMain(parameters);
            break;
        case pages.nodes:
            var hash = '#n';
            for (i = 0; i < parameters.length; i++) {
                hash += parameters[i];
                hash += "&";
            }
	    window.location.hash = hash.slice(0, -1);
            nodesMain(parameters);
            break;
        case pages.spectrum:
	    var hash = '#s';
            for(i = 0; i < parameters.length; i++) {
                hash +=parameters[i];
                hash += "&";
            }
            window.location.hash = hash.slice(0, -1);
            spectrumMain(parameters);
            break;
        case pages.agg_single:
            window.location.hash = '#a' + parameters;
            agg_singleMain(parameters);
            break;
    } 
}

//handle control of back button
//by popping call stack and going there
function goBack(current)
{
    if(call_stack.length < 1)
        return;
    var previous = call_stack.pop();
    goTo(current, previous[0], previous[1], true);
}

//handles call stack updating when you use the fancy back button
function handle_dropdown_click(element, source)
{
    var number_to_pop = d3.select(element).attr("data-number") - 1;
    var target = call_stack[call_stack.length - 1 - number_to_pop]; 

    for(var i = 0; i < number_to_pop+1; i++)
    {
        call_stack.pop();
    }
    goTo(source, target[0], target[1], true);
}

//handles call stack updating when you use the fancy back button
function handle_dropdown_agg_click(element, source)
{
    goTo(source, pages.agg_single, d3.select(element).attr("data-number"), false);
}

//add a back to corpus button
//as well as our fancy new back selector
function addCorpusLink(source)
{
    var pressTimer;
    var agg_timer;
    var should_go_back = true; //need to not trigger regular click if we mean to long click

    d3.select("#header").append("button").attr("class", "corpus-link").text("Back to Corpus!").on("click", function()
    {
        goTo(source, pages.corpus, "regular")
    });

    d3.select("#header").append("button").attr("class", "back-button").html("Back to Previous View&darr;").on("mouseup", function()
    {
        clearTimeout(pressTimer);
        if(should_go_back)
        {
            goBack(source);
        }
        should_go_back = true;
    }).on("mousedown", (function() 
    {
        pressTimer = window.setTimeout(function() 
        { 
            should_go_back = false;
            var back_x = $(".back-button").offset().left + 3;
            var back_y = $(".back-button").offset().top + 20;
            d3.select(".dropdown-back").style("visibility","visible").style("top", back_y+"px").style("left",back_x+"px")
            d3.select(".dropdown-back").html(generate_dropdown_html());
            d3.selectAll(".dropdown-element").on("mouseover", function() { d3.select(this).style("background-color", "#72a6f9"); });
            d3.selectAll(".dropdown-element").on("mouseout", function() { d3.select(this).style("background-color", "white"); });
            d3.selectAll(".dropdown-element").on("click", function() { handle_dropdown_click(this,source); });
        },500);
    }));

    d3.select("#header").append("button").attr("class", "aggregate-button").html("See aggregates&darr;").on("mouseup", function() 
    {
           clearTimeout(agg_timer); 
    }).on("mousedown", function() 
    {
        agg_timer = window.setTimeout(function() 
        {
            var back_x = $(".aggregate-button").offset().left + 3;
            var back_y = $(".aggregate-button").offset().top + 20;
            d3.select(".dropdown-agg").style("visibility","visible").style("top", back_y+"px").style("left",back_x+"px")
            d3.select(".dropdown-agg").html(generate_dropdown_aggregate_html());
            d3.selectAll(".dropdown-element").on("mouseover", function() { d3.select(this).style("background-color", "#72a6f9"); });
            d3.selectAll(".dropdown-element").on("mouseout", function() { d3.select(this).style("background-color", "white"); });
            d3.selectAll(".dropdown-element").on("click", function() { handle_dropdown_agg_click(this, source); });
        },500); 
    });

    window.onclick = function(event) 
    {
        if(!event.target.matches(".back-button"))
        {
            d3.select(".dropdown-back").style("visibility","hidden"); 
        }
        if(!event.target.matches(".aggregate-button"))
        {
            d3.select(".dropdown-agg").style("visibility","hidden"); 
        }
    }
}

//take off the button added by addCorpusLink
function removeCorpusButton()
{
    d3.select(".corpus-link").remove();
    d3.select(".back-button").remove();
    d3.select(".aggregate-button").remove();
}

//get a given document from the server
function getDocumentData(docs, callback, parameters)
{
    var requests = Array();
    for(var i = 0; i < docs.length; i++)
    {
        //if(!(docs[i] in document_text))
        //{
            requests.push($.get('/document_text?doc='+docs[i]));
        //}
    }

    var defer = $.when.apply($, requests);
    defer.done(function(){
        // This is executed only after every ajax request has been completed

        $.each(arguments, function(index, responseData){
            var current = responseData[0];
            var i = docs[index];
            document_text[i] = responseData[0];
        });
        callback(parameters);
    });
}

//make the cursor indicate that the attribute selected by *selector* is clickable
function make_clickable(selector)
{
    d3.selectAll(selector).classed("clickable", true);
} 

//opposite of above
function make_nonclickable(selector)
{
    d3.selectAll(selector).classed("clickable", false);
} 
