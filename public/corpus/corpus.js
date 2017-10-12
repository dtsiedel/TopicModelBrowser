var csv_data;
var chart;

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructChart function the first time
//needs to be split later so that we can not duplicate code
function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 600 - margin.left - margin.right;
    height = width - margin.top - margin.bottom;
    radius = Math.min(width, height) / 2;

    // add the canvas to the DOM 
    chart = d3.select("#corpus-demo")
        .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("stroke", gray)
        .attr("stroke-width", "0.5");

    d3.csv("/topic_frame.csv", function(error, response) {
        csv_data = response;
        constructCorpus(csv_data);
    });
}


function constructCorpus(csv)
{
    console.log(csv);
}


function main()
{
    getData();
}


//call main
document.addEventListener("DOMContentLoaded", function(e) {
    main();
});
