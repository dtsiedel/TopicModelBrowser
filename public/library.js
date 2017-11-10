//Includes functions used by multiple views, to avoid duplication

var threshold = 0.05; //how high must a topic be to be included?
var corpus_threshold = 750; //how many documents must be shared for the link to be in the corpus view?
var chord_threshold = 500; //how many related docs should be shown in info box per chord?
var colors = ["#1CE6FF", "#FF34FF", "#FF4A46", "#008941", "#006FA6", "#A30059",
        "#FFDBE5", "#7A4900", "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87",
        "#5A0007", "#809693", "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
        "#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9", "#B903AA", "#D16100",
        "#000035", "#7B4F4B", "#A1C299", "#300018", "#0AA6D8", "#013349", "#00846F",
        "#372101", "#FFB500", "#A079BF", "#CC0744", "#C0B9B2", "#001E09",
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
var color_map = {};
var filteredData;
var csv_data = [];
var topic_indices = {}; 
var gray = "#d3d3d3";
var ribbon_data;
var ribbon_counts;
var document_text = {};

document.addEventListener("DOMContentLoaded", function(e) {
    console.log("loaded libary");
});

//gives a random index in the range of our documents
function randomDocument()
{   
    return Math.floor(Math.random()*csv_data.length);
}

//filter out topics that are less than thresh or invalid
function filter(topic_array)
{
    var filtered = [];
    var total = 0; //total should add to one, need this to see total of "other"
    var count = 1;
    for(key in topic_array)
    {
        if(key.length === 0)
            continue
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

//put a legend onto chart
function addLegend(chart, data, legendRectSize, legendSpacing)
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
        var vert = i * height - offset;
        return 'translate(' + horz + ',' + vert + ')';
      });

    legend.append('rect')
        .attr('width', legendRectSize)
        .attr('height', legendRectSize)
        .style('fill', function(d){return d.color})
        .style('stroke', "gray")
        .on("click", function(d,i) {window.location = "/topic?t=" + d.index; });

    legend.append('text')
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', legendRectSize - legendSpacing + offset)
        .style("fill", "white")
        .text(function(d) { return clip(commas(d.topic),70); });
}


//replace all instances of _ with , for topic display
function commas(text)
{
    return text.replace(/_/g, ", "); 
}

//does all the text formatting for the tooltip
function generate_tooltip_html(topic_number, topic_name, percentage)
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
                        count++;
                    }
                }
            }
        } 
 
        //callback hell incoming
        getRibbonCounts(function()
        {
            getRibbonData(function()
            {
                func();
            });
        });
    });
}
    
//why do I have to write array intersection code myself in 2017?
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
        lines.splice(-2,2); //two stragglers on this split, remove them

        ribbon_data = [];
        for(var i = 0; i < lines.length; i++)
        {
            var arrays = lines[i].split("|"); //divider for each array in a line
            ribbon_data.push([]);

            for(var j = 0; j < arrays.length; j++)
            {
                var numbers = arrays[j].split(",");
                ribbon_data[i][j] = numbers;
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

//create the html element that the tooltip resides in
function generate_document_tooltip(id)
{
    var data = document_text[id];
    var result = "<div>";
    result += "Excerpt: </br>";
    result += clip(data["text"], 350);

    result += "</div>";

    return result;
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
