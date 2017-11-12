var chart;
var margin;
var width;
var height;
var tooltip;

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructSpectrum function the first time
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
    var docs1 = randomSample(ribbon_data[t1][t1], n);
    var docs2 = randomSample(ribbon_data[t2][t2], n);
    var shared = randomSample(ribbon_data[t1][t2], n);
    var alignment = {"left": [], "center": [], "right": []};
    alignDocs(docs1, docs2, shared, alignment);
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
function alignDocs(left, right, center, alignment)
{
    var textLeft = getDocText(left);
    var textRight = getDocText(right);
    var textCenter = getDocText(center);
    var leftCounts = getWordCounts(textLeft, 10);
    var rightCounts = getWordCounts(textRight, 10);
    var centerCounts = getWordCounts(textCenter, 10);
   
    console.log(centerCounts); 
    console.log(leftCounts); 
    console.log(rightCounts); 
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
