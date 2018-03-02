var corpus_style = "simple";

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructCorpus function the first time
//needs to be split later so that we can not duplicate code
function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 600 - margin.left - margin.right;
    height = width - margin.top - margin.bottom;
    radius = Math.min(width, height) / 2;

    if(d3.selectAll(".tooltip")[0].length === 0)
    {
        tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("width", "225px")
            .style("background-color", "white")
            .style("padding-left", "5px")
            .style("z-index", "10") //put it in front of the arcs
            .style("border-radius", "10px")
            .style("visibility", "hidden")
            .style("border", "1px solid white")
            .text(""); //bad to see this (obviously)
    }

    if(!loaded_data)
    {    
        d3.select("#chart-container").append("div").attr("class", "loader");
        d3.select("#chart-container").append("div").attr("class", "load-text").html("<br/>Loading Data...");
        d3.select(".loader").style("border-top", "16px solid " + randomColor()); 
        getTopicIndices(function()
        {
            d3.select(".loader").style("border-top", "16px solid " + randomColor()); 
            d3.csv("/topic_frame.csv", function(error, response) 
            {
                d3.select(".loader").style("border-top", "16px solid " + randomColor()); 
                //get_document_full_texts(function()
                //{
                    csv_data = response;
                    csv_data = rectify_csv_data(csv_data);
                   
                    d3.select(".loader").remove();
                    d3.select(".load-text").remove();


                    //Read URL hash fragment and then based on fragment go to certain page and load in that data 
                    var hash = window.location.hash.substr(1);
                    //if no hash, go to corpus
                    if(!hash){
                        constructCorpus();
                    }
                    else{
                        var page = hash.charAt(0);
                        switch(page){
                            //donut
                            case "d":
                                donutMain(hash.substr(1));
                                break;
                            //topic
                            case "t":
                                //need to add page number
                                var parameters = [];
                                var tmp = '';
                                hash = hash.substr(1);
                                for (i = 0; i < hash.length; i++) {
                                    if(hash[i] != '#'){
                                        tmp += hash[i];
                                    }
                                    else {
                                        //get past the p in the #p to designate start of page part
                                        i++;
                                        //first var is topic number
                                        parameters.push(tmp);
                                        tmp = "";
                                    }
                                }
                                //second var is page page number
                                parameters.push(tmp);
                                topicMain(parameters);
                                break;
                            //bars
                            case "b":
                                var parameters = [];
                                var document = "";
                                hash = hash.substr(1);
                                for (i = 0; i < hash.length; i++) {
                                    if(hash[i] != '&'){
                                        document += hash[i];
                                    }
                                    else {
                                        parameters.push(document);
                                        document = "";
                                    }
                                }
                                parameters.push(document);
                                barsMain(parameters);
                                break;
                            //nodes
                            case "n":
                                var parameters = [];
                                var document = "";
                                hash = hash.substr(1);
                                for (i = 0; i < hash.length; i++) {
                                    if(hash[i] != '&'){
                                        document += hash[i];
                                    }
                                    else {
                                        parameters.push(document);
                                        document = "";
                                    }
                                }
                                parameters.push(document);
                                nodesMain(parameters);
                                break;
                            //spectrum
                            case "s":
                                var parameters = [];
                                var document = "";
                                hash = hash.substr(1);
                                for (i = 0; i < hash.length; i++) {
                                    if(hash[i] != '&'){
                                        document += hash[i];
                                    }
                                    else {
                                        parameters.push(document);
                                        document = "";
                                    }
                                }
                                parameters.push(document);
                                spectrumMain(parameters);
                        }
                    }
                    
            });
        });
        loaded_data = true;
    }
    else
    {
        getTopicIndices(function(){constructCorpus()}); 
    }
}

//wrapper to be called when page loads
function main(parameters)
{
    getData(parameters); 
}

//call main
document.addEventListener("DOMContentLoaded", function(e) {
    main();
});
