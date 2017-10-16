//Includes functions used by multiple views, to avoid duplication

var threshold = 0.05; //how high must a topic be to be included?
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
var csv_data = [];
var topic_indices = {}; 
var gray = "#d3d3d3";

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
        newEntry["color"] = getColor(count);
        filtered.push(newEntry);
        total += parseFloat(val);
        count++;
    }
    var other = {};
    other["index"] = 0;
    other["topic"] = "other";
    other["value"] = 1 - total;
    other["color"] = gray;
    filtered.push(other);
    return filtered;
}

//assign a color to topic n, or pull the color for n if it is already assigned
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
        .style('stroke', "gray");

    legend.append('text')
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', legendRectSize - legendSpacing + offset)
        .style("fill", "white")
        .text(function(d) { return clip(d.topic,70); });
}

//does all the text formatting for the tooltip
function generate_tooltip_html(topic_number, topic_name, percentage)
{
    topic_words = topic_name.split("_");
    text = "<div>";
    text += "T" + topic_number + " (" + (percentage*100).toFixed(2) + "%)" + "<br>Sample Words:<br>";
    for(var i = 0; i < topic_words.length; i++)
    {
        text += topic_words[i];
        text += "<br>"
    }
    text += "</div>";
    return text;
}

//initialize mapping of topic names to index
function getTopicIndices()
{
    //TODO: redundancy with processData in corpus view
    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        var count = 1;
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
    });
}
