var chart;
var margin;
var width;
var height;
var tooltip;

var x_start = -100;
var x_end = 600;
var y_start = 0;
var y_end = -200;
var _mid = (x_start + x_end) / 2
var y_mid = (y_start + y_end) / 2;

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructSpectrum function the first time
//needs to be split later so that we can not duplicate code
function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 840 - margin.left - margin.right;
    height = width - margin.top - margin.bottom;
    radius = Math.min(width, height) / 2;

    chart = d3.select("#spectrum-demo")
        .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + ((width/4)) + "," + ((height/2)+margin.top) + ")");
 
    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        csv_data = rectify_csv_data(csv_data);

        var url_string = window.location.href; //fetch document we want to show
        var url = new URL(url_string);
        var t1 = url.searchParams.get("t1");
        var t2 = url.searchParams.get("t2");
        
        get_document_full_texts(function()
        {
            getRibbonData(function()
            {
                get_stopwords(function()
                {
                    if(t1 === null)
                    {
                        t1 = randomTopic();
                    }
                    if(t2 === null)
                    {
                        t2 = randomTopic();
                    }
                    console.log(t1);
                    console.log(t2);
                    constructSpectrum(t1, t2, 10);
                });
            });
        });
    });
}

//get n random documents from the list n
function randomSample(docList, n)
{
    if(docList.length < n)
    {
        return docList;
    }

    var result = [];
    for(var i = 0; i < n; i++)
    {
        var random; 
        while(true)
        {
            random = Math.floor(Math.random()*docList.length);
            if(!result.includes(random))
                break;
        }
        result.push(random);
    }
    return result;
}

//make the spectrum view, including the two sides and the inner words
function constructSpectrum(t1, t2, n)
{
    var color_scale = d3.interpolateRgb(colors[t1], colors[t2]);
    var docs1 = randomSample(ribbon_data[t1][t1], n);
    var docs2 = randomSample(ribbon_data[t2][t2], n);
    var shared = randomSample(ribbon_data[t1][t2], n);
    plotTopics(t1, t2, color_scale);
    alignDocs(docs1, docs2, shared, 10, color_scale);
}

//put the topic names onto the screen
function plotTopics(t1, t2, color_scale)
{
    chart.append("text")
        .attr("x", x_start)
        .attr("y", y_mid)
        .style("fill", color_scale(0))
        .style("font-size", "25px")
        .text("T" + t1);

    chart.append("text")
        .attr("x", x_end)
        .attr("y", y_mid)
        .style("fill", color_scale(1))
        .style("font-size", "25px")
        .text("T" + t2);
}

//for each document number in the doclist, get the text
//returns a list of document texts
function getDocText(docList)
{
    var result = [];
    for(var i = 0; i < docList.length; i++)
    {
        result.push(document_text[docList[i]].text);
    }
    return result;
}

//get the n most used words in each of the documents in the list
function getWordCounts(textList, n)
{
    var result = {};
    for(var i = 0; i < textList.length; i++)
    {
        var words = textList[i].split(/[.,\/ -]/);
        for(var i = 0; i < words.length; i++)
        {
            var word = words[i];
            if(stopwords.includes(word))
            {
                continue;
            }
            if(word in result)
            {
                result[word]++; 
            }
            else
            {
                result[word] = 1;
            }
        }
    }
    
    var items = Object.keys(result).map(function(key) {
        return [key, result[key]];
    });
    items.sort(function(first, second) {
        return second[1] - first[1];
    });

    items = items.map(function(x) {
        return x[0];
    });

    return items.slice(0,n);
}

//determine where in the spectrum words should be placed
function alignDocs(left, right, center, wordCount, color_scale)
{
    var textLeft = getDocText(left);
    var textRight = getDocText(right);
    var textCenter = getDocText(center);
    var leftCounts = getWordCounts(textLeft, wordCount);
    var rightCounts = getWordCounts(textRight, wordCount);
    var centerCounts = getWordCounts(textCenter, wordCount);
    
    console.log(centerCounts); 
    console.log(leftCounts); 
    console.log(rightCounts); 

    plotWords(leftCounts, centerCounts, rightCounts, color_scale);
}

//actually draws all the words that we want
function plotWords(leftCounts, centerCounts, rightCounts, color_scale)
{
    var x_length = x_end - x_start;
    var left_x = x_start + 1/4 * x_length;
    var center_x = x_start + 1/2 * x_length;
    var right_x = x_start + 3/4 * x_length;
    var y_array = nRandRange(30, y_start, y_end);
    var smoother = 15; //smooth near edges, where words don't reach
  
    for(var i = 0; i < leftCounts.length; i++)
    {
        var x = fuzz(left_x, (x_end - x_start) / 5);
        var y = y_array.pop();
        chart.append("text")
            .attr("x", x)
            .attr("y", y)
            .text(leftCounts[i])
            .style("fill", color_scale((x+smoother)/(x_end-x_start)));
    }
      
    for(var i = 0; i < centerCounts.length; i++)
    {
        var x = center_x; 
        var x = fuzz(center_x, (x_end - x_start) / 5);
        var y = y_array.pop();
        chart.append("text")
            .attr("x", x)
            .attr("y", y)
            .text(centerCounts[i])
            .style("fill", color_scale((x+smoother)/(x_end-x_start)));
    }
   
    for(var i = 0; i < rightCounts.length; i++)
    {
        var x = fuzz(right_x, (x_end - x_start) / 5);
        var y = y_array.pop();
        chart.append("text")
            .attr("x", x)
            .attr("y", y)
            .text(rightCounts[i])
            .style("fill", color_scale((x-smoother)/(x_end-x_start)));
    }
  
}

function fuzz(value, fuzz)
{
    var fuzz = nRandRange(1, -fuzz, fuzz).pop(); 
    return value + fuzz;
}

//make a text representation of the document
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
