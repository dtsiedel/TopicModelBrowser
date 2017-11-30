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

//main
function nodesMain(parameters)
{
    setUpNodes(parameters);
}

//parses our csv hosted on server
//also does all of the one-time setup and calls our constructNodes function the first time
function setUpNodes(parameters)
{
    addCorpusLink(pages.nodes);

    documents = [];
    var desired_documents = parameters;

    for (var i = 0; i < desired_documents.length; i++) {
        //isolate values (first value is doc num)
        var curDoc = (desired_documents[i]);
        
        documents.push(Object.values(csv_data[curDoc]));
        documents[i] = Object.values(documents[i])
    }

    calculateDistance(documents);
}


//This needs to change to have the key be distance measures between each of the topics
function calculateDistance(documents)
{
    results = [];
    for(var i = 0; i < documents.length; i++) {
      var current = [];

      for(var j = i+1; j < documents.length; j++) {
        current[j] = cosineDistance(documents[i], documents[j]);
      }
      results.push(current);
    }

    constructNodes(defineLinks(results, documents), defineNodes(documents));
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
function constructNodes(links, nodes){
  var docs = [];
  for(var i = 0; i < nodes.length; i++)
  {
    docs.push(nodes[i].id);
  }
  getDocumentData([docs], function()
  {
      var width = 1000;
      var height = 1000;

      var color = d3.scale.category20();

      var force = d3.layout.force()
        .charge(-1500)
        .linkDistance(80)
        .size([width, height]);

      var svg = d3.select("#chart-container").append("svg")
        .attr("class", "nodes-svg")
        .attr("width", width)
        .attr("height", height);

      //align in the center of the graph
      //d3.select("#chart").attr("align","center");

      //console.log(links);
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
            goTo(pages.nodes, pages.donut, d.id)
        });

      node.append("circle")
        .attr("class", "nodes-circle")
        .attr("r", function(d,i){ return i%2==0?7:5 })
        .style("fill", function(d) {
          return color(d.group);
        })
        .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
        .on("mousemove", function(d)
        {
            return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_document_tooltip(d.id)).style("background-color", "white").style("color", "black").on("mouseout", function(){return tooltip.style("visibility", "hidden")});
        })
        .on("mouseout", function(){return tooltip.style("visibility", "hidden");});


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

        d3.selectAll(".nodes-circle").attr("cx", function(d) {
            return d.x;
          })
          .attr("cy", function(d) {
            return d.y;
          });
      });
    });
}

//remove everything we added for nodes
function nodesCleanup()
{
    d3.select(".tooltip").style("visibility", "hidden");
    removeCorpusButton();
    d3.select(".nodes-svg").remove();    
}
