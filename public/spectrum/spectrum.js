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
        
        if(t1 === null)
        {
            t1 === randomTopic();
        }
        if(t2 === null)
        {
            t2 === randomTopic();
        }
        get_document_full_texts(function()
        {
            constructSpectrum(t1, t2);
        });
    });
}

//make the corpus view, incuding arcs and ribbons
function constructSpectrum(t1, t2)
{
    //var processed = processData(csv);   //don't do this anymore, since it is done offline
 
    var matrix = ribbon_data; 
    var n_topics = matrix.length;

    console.log(matrix);
    console.log(n_topics);
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
