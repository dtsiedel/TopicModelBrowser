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
  document.title = "Multi-Documents";
  var docs = [];
  for(var i = 0; i < nodes.length; i++)
  {
    docs.push(nodes[i].id);
  }

  

  getDocumentData([docs], function()
  {
      var width = 1000; //750;
      var height = 500; //750;

      var color = d3.scale.category20();

      var force = d3.layout.force()
        .charge(-2000)
        .linkDistance(80)
        .size([width, height]);

      var svg = d3.select("#chart-container").append("svg")
        .attr("class", "nodes-svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.behavior.zoom().on("zoom", function () {
          svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
        }))
        .append("g");

      
      force.nodes(nodes)
        .links(links)
        .start();

      var link = svg.selectAll(".link")
        .data(links)
        .enter().append("line")
        .call(force.drag())
        .attr("class", "link")
        .style("stroke-width", function(d) {
            return 1; 
        });

      var node = svg.selectAll(".node")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node")
        .call(force.drag)
        .on("mouseover", function(d) {
          //change edge width
          link.style('stroke-width', function(l) {
            return d === l.source || d === l.target ? 4 : .4; 
          });

        })
        .on('mouseout', function() {
          link.style('stroke-width', .4);
          link.style('stroke', "white")
        })
        .on("click", function(d) {
            goTo(pages.nodes, pages.donut, d.id)
        });

    var pieRadius = 20; 
    function arcTween(d) {
        arc = d3.svg.arc().outerpieRadius(pieRadius*1.1).innerpieRadius(pieRadius*.5).cornerpieRadius(3);
        return arc(d);
    }

    var arc = d3.svg.arc()
        .outerRadius(pieRadius)
        .innerRadius(pieRadius*.5)
        .cornerRadius(1);

    var pie = d3.layout.pie()
        .sort(null)
        .startAngle(0)
        .endAngle(2*Math.PI)
        .value(function(d) { return d.value; });

    //make the nodes each look like a tiny pie chart
    var pies = node.append("g")
        .attr("class", "nodes-pie")

    

    var allfilteredData = [];

    pies.each(function(d)
    {
        var doc_n = d.id;
        var chosenDocument = csv_data[doc_n];
        filteredData = filter(chosenDocument);
        
        //only add to filtered data what is new (gross way of doing it... but nothing else is working...)
        for (var i = 0; i<filteredData.length; i ++){
          var isIn = false;
            for(var j = 0; j<allfilteredData.length; j++){
              if(filteredData[i].index == allfilteredData[j].index) {
                isIn = true;
                break;
              }
            }  
            //make sure other is put at the end of the list (change later.. because largest isnt at top of list now)
            if(!isIn) {
              if(filteredData[i].index != "~"){
                allfilteredData.push(filteredData[i]);
              }
              else{
                allfilteredData.unshift(filteredData[i]);
              }
            }  
        }

        var g = d3.select(this).selectAll(".arc")
            .data(pie(filteredData))
            .enter().append("g")
            .attr("class", "arc");

        getDocumentData([chosenDocument,0], function()
        {
            g.append("path")
                .on("mouseover", function(){return tooltip.style("visibility", "visible");}) //bind tooltip to when mouse goes over arc
                .on("mousemove", function(d){
                    var topic_text = d3.select(this).data()[0]["data"]["topic"];
                    var index = d3.select(this).data()[0]["data"]["index"];
                    return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").html(generate_document_tooltip(doc_n)).style("background-color", gray).style("color", "white");})
                .on("mouseout", function(){return tooltip.style("visibility", "hidden");})
                .style("fill", function(d,i) { return d.data.color; })
                .transition().duration(5)
                .attr("id", function(d,i) { return "arc_"+i; })
                .attrTween('d', function(d) {
                    var i = d3.interpolate(d.startAngle, d.endAngle-.01); //calculate the in between positions to draw in 
                    return function(t) {
                        d.endAngle = i(t);
                        return arc(d);
                    }
		    
                })
    
        
        });

    });

    //addLegend(pies, allfilteredData, 18, 12);
    //console.log(pies);    

    force.on("tick", function() {
      node 
          .attr("cx", function(d) {
          //return d.x = Math.max(radius, Math.min(width - radius, d.x)); 
          return d.y;
          })
          .attr("cy", function(d) { 
            return d.y; 
          });  
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
          

        d3.selectAll(".nodes-pie").attr("transform", function(d){ return "translate(" + d.x + "," + d.y + ")"});
      });
    });
}

//remove everything we added for nodes
function nodesCleanup()
{
    d3.select(".tooltip").style("visibility", "hidden");
    removeCorpusButton();
    d3.select(".nodes-svg").remove();    
    window.scrollTo(0, 0); 
}
