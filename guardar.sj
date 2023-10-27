event.preventDefault();
			 var tableResults = [];
			 var rows = table.rows.length;
			 if (row > 1) {
			 	for (var r = 0; r < rows; r++) {
			 		var property = document.getElementById("tr_"+nodeId+"_"+(a+1)+"_property");
			 		var propertyText=property.text();
			 		var value = document.getElementById("tr_"+nodeId+"_"+(a+1)+"_value");
			 		var propertyText=property.text();

			 		tableResults.push(propertyText);
			 		tableResults.push(valueText);
			 	}

			 }
			 var selectorProperty = document.getElementById("selector" + type);
			 var selectorValue = document.getElementById("selector" + type + "2");
			 tableResults.push(selectorProperty.options[selectorProperty.selectedIndex].value);
			 tableResults.push(selectorValue.options[selectorValue.selectedIndex].value);

			
			 var table = document.getElementById("tableResult_"+nodeId);
			 var tableTr = document.createElement("tr");
			 tableTr.setAttribute("id", "tableTr" + valueButtonInt);
			 tableTr.setAttribute("class", "borderTable");
			 table.appendChild(tableTr);
             