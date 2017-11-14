//see bars for TODOs
//var jaccard = require('jaccard');
var gray = "#7d8084";
var margin;
var width;
var height;
var radius;
var chart;
var tooltip;
var size = d3.scale.pow().exponent(1)
  .domain([1,100])
  .range([8,24]);

//driver
function main()
{
    getTopicIndices(getData);
}

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructChart function the first time
function getData()
{
    //variables to control the graph result
    margin = {top: 20, right: 20, bottom: 20, left: 20};
    width = 1000 - margin.left - margin.right;
    height = width - margin.top - margin.bottom - 500;
    radius = 6;

    // add the canvas to the DOM
    chart = d3.select("#nodes-demo")
        .append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + ((width/4)) + "," + ((height/2)+margin.top) + ")");

    tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("width", "200px")
        .style("background-color", "white")
        .style("padding-left", "5px")
        .style("z-index", "10") //put it in front of the arcs
        .style("border-radius", "10px")
        .style("visibility", "hidden")
        .style("border", "1px solid white")
        .text("Error"); //bad to see this (obviously)

        d3.csv("/topic_frame.csv", function(error, response) {
            csv_data = response;

            //starting with 100 random unique documents
            //initalized with documents inside, otherwise it gets confused on the type
            var documents = [csv_data[randomDocument()]];

            for (var i = 0; i < 99; i++) {
              //isolate values (first value is doc num)
              curDoc = (randomDocument());
              while(documents.includes(curDoc)) {
                curDoc = (randomDocument());
              }
              documents.push(csv_data[curDoc]);
              documents[i] = Object.values(documents[i])
            }
            calculateDistance(documents);
    });
}


//This needs to change to have the key be distance measures between each of the topics
function calculateDistance(documents)
{
    results = [];
    //calculating similarity because, index
    for(var i = 0; i < documents.length; i++) {
      var current = [];
      //if not -1 get NaNs
      for(var j = i+1; j < documents.length - 1; j++) {
        //get just values of each document
        current[j] = cosineDistance(documents[i], documents[j]);
      }
      results.push(current);
    }

    constructChart(defineLinks(results, documents), defineNodes(documents));
}


function defineLinks(results, documents) {
  links = [];
  for(var i = 0; i < results.length; i++) {
    for(var j = i; j < results.length; j++) {
      if(results[i][j] > cosineThreshold) {
        var obj = new Object();
        obj.source = i;
        obj.target = j;
        obj.value = results[i][j];
        links.push(obj);
      }
    }
  }
  return links;

}

function defineNodes(documents) {
  nodes = [];
  for(var i = 0; i < documents.length; i++) {
    var obj = new Object();
    obj.id = documents[i][0];
    if(typeof obj.id === 'undefined'){
      continue;
    }
    else {nodes.push(obj);}
  }
  return nodes;
}


//This code is taken from the source code of the Jaccard library. The import would not work and so I directly copied the code into here
// Credit goes to jaccard at <cam@campedersen.com> for writing this.
function cosineDistance(a, b) {

  /*
   * calculate dot product. basecode found from open source wiki
   */
  var dot = function (a, b) {
    var sum = 0;
    var size = Math.min(a.length,b.length);
    //start at 1 because the first value is the doc num
	  for (var i = 1; i < size; i++){
      sum += a[i] * b[i];
    }
	  return sum;
  }

  /*
   * Return distinct elements from both input sets
   */
  var magnitude = function (a) {
    sum = 0;
    //start at 1 because the first value is the doc num
    for (var i = 1; i < a.length; i++) {
      sum += (a[i] * a[i]);
    }
    return Math.sqrt(sum);

  }

  return dot(a, b)/(magnitude(a) * magnitude(b));


}


//make node diagram
function constructChart(links, nodes){
  var width = 1200,
    height = 600;

  var color = d3.scale.category20();

  var force = d3.layout.force()
    .charge(-500)
    .linkDistance(80)
    .size([width, height]);

  var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

  //allign in the center of the graph
  d3.select("#chart").attr("align","center");

  force.nodes(nodes)
    .links(links)
    .start();

  var link = svg.selectAll(".link")
    .data(links)
    .enter().append("line")
    .attr("class", "link")
    .style("stroke-width", function(d) {
      return Math.sqrt(d.value);
    });

  var node = svg.selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", "node")
    .call(force.drag)
    .on("mouseover", function(d) {
      //change node outline
      node.style('stroke', function(l) {
      });
      //change edge width
      link.style('stroke-width', function(l) {
        return d === l.source || d === l.target ? 5 : Math.sqrt(d.value);
      });
      //change edge color
      link.style('stroke', function(l) {
        return d === l.source || d === l.target ? "#C7E1F3" : "white";
      });

    })
    .on('mouseout', function() {
      link.style('stroke-width', .4);
      link.style('stroke', "white")
      node.style('stroke', "#1F77B4")
    })
    .on("click", function(d) {
      window.location.href = "/donut?doc="+d.id;
    });


  node.append("circle")
    .attr("r", function(d,i){ return i%2==0?7:5 })
    .style("fill", function(d) {
      return color(d.group);
    })
    .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
    .on("mousemove", function(d){
      console.log(d);
      return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").text("Document " + d.id).style("background-color", "white").style("color", "black");})
    .on("mouseout", function(){return tooltip.style("visibility", "hidden");})


  force.on("tick", function() {
    link.attr("x1", function(d) {
        return d.source.x;
      })
      .attr("y1", function(d) {
        return d.source.y;
      })
      .attr("x2", function(d) {
        return d.target.x;
      })
      .attr("y2", function(d) {
        return d.target.y;
      });

    node.attr("cx", function(d) { return d.x = Math.max(radius, Math.min(width - radius, d.x)); })
    .attr("cy", function(d) { return d.y = Math.max(radius, Math.min(height - radius, d.y)); });

    d3.selectAll("circle").attr("cx", function(d) {
        return d.x;
      })
      .attr("cy", function(d) {
        return d.y;
      });

    d3.selectAll("text").attr("x", function(d) {
        return d.x;
      })
      .attr("y", function(d) {
        return d.y;
      });

  });

}



//waiting for page to load, then call main
//call main on load
document.addEventListener("DOMContentLoaded", function(e) {
  main();
});
