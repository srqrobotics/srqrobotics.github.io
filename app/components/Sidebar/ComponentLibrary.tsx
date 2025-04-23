import React, { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import type { FileSystemItem } from "~/types/files";
import { API_KEY } from "../../config/config"; // Adjust the path as necessary

interface ComponentItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  image?: {
    src: string;
    width: number;
    height: number;
  };
}

interface ComponentCategory {
  name: string;
  items: ComponentItem[];
  children?: ComponentCategory[];
}

interface ApplicationChoice {
  id: number;
  name: string;
  description: string;
}

export default function ComponentLibrary() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(
    new Set()
  );
  const [appChoices, setAppChoices] = useState<string[]>([]);
  const [showAppChoices, setShowAppChoices] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [applicationsList, setApplicationsList] = useState<{
    applications: ApplicationChoice[];
  }>({ applications: [] });
  const fetcher = useFetcher();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    fetcher.load("/api/packages");
  }, []);

  useEffect(() => {
    if (fetcher.data?.packages) {
      console.log("Fetched packages:", fetcher.data.packages);
      processPackages(fetcher.data.packages).then((processed) => {
        console.log("Processed categories:", processed);
        setCategories(processed);
      });
    }
  }, [fetcher.data]);

  const processPackages = async (
    packages: FileSystemItem[]
  ): Promise<ComponentCategory[]> => {
    console.log("Processing packages:", packages);

    const processDirectory = async (
      dir: FileSystemItem
    ): Promise<ComponentCategory> => {
      const items: ComponentItem[] = [];
      const children: ComponentCategory[] = [];

      for (const item of dir.children || []) {
        if (item.type === "directory") {
          const childCategory = await processDirectory(item);
          children.push(childCategory);
        } else if (item.type === "file" && item.name.endsWith(".json")) {
          try {
            console.log("Loading component data for:", item.path);
            const response = await fetch(
              `/api/file-content?path=${encodeURIComponent(item.path)}`
            );
            const data = await response.json();
            console.log("Loaded component data:", data);

            const componentItem: ComponentItem = {
              id: item.name.replace(".json", ""),
              name: data.name || item.name.replace(".json", ""),
              path: item.path,
              icon: "🔲",
              image: data.image,
            };
            console.log("Created component item:", componentItem);
            items.push(componentItem);
          } catch (error) {
            console.error(
              `Error loading component data for ${item.path}:`,
              error
            );
            items.push({
              id: item.name.replace(".json", ""),
              name: item.name.replace(".json", ""),
              path: item.path,
              icon: "🔲",
            });
          }
        }
      }

      return {
        name: dir.name,
        items,
        ...(children.length > 0 && { children }),
      };
    };

    const categories = await Promise.all(
      packages.filter((pkg) => pkg.type === "directory").map(processDirectory)
    );

    console.log("Final categories:", categories);
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const saveConfig = async (
    filePath: string,
    content: string
  ): Promise<void> => {
    // Replace literal \n with actual newlines and wrap each element in backticks

    const saveResponse = await fetch(`/api/save-config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: filePath,
        content: content,
      }),
    });

    const responseText = await saveResponse.text();
    console.log(`Save response for ${filePath}:`, {
      status: saveResponse.status,
      ok: saveResponse.ok,
      text: responseText,
    });

    if (!saveResponse.ok) {
      throw new Error(
        `Failed to save config: ${saveResponse.statusText}. Details: ${responseText}`
      );
    }

    try {
      const result = JSON.parse(responseText);
      console.log("Save response parsed:", result);
    } catch (e) {
      console.log("Could not parse save response as JSON:", responseText);
    }
  };

  const handleLogSelectedComponents = async () => {
    try {
      // Simulated API response
      console.log("Selected components:", selectedComponents);

      const applicationsPrompt = `
      Based on the following electronic components:
      
      ${Array.from(selectedComponents).join(", ")}
      
      Generate a list of five possible project applications that can be built using these components. Each application should have a short description of its purpose.
      
      The response should be in the following JSON format:
      
      {
        "applications": [
            {
              "name": "Application Name",
              "description": "Brief description of how the system works"
            }
        ]
      }
      
      The generated applications should be practical, relevant, and make effective use of the given components.
      `;

      // console.log("Generated applications prompt:", applicationsPrompt);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: API_KEY, // Replace with your actual API key
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: applicationsPrompt,
              },
            ],
          }),
        }
      );

      // Check if the response is OK (status in the range 200-299)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Attempt to parse the response as JSON
      const responseText = await response.text(); // Get the raw response text
      // console.log("Raw response:", responseText); // Log the raw response for debugging

      const responseJSON = JSON.parse(responseText); // Try to parse the response;

      try {
        const raw_msg = responseJSON.choices[0].message.content;
        // console.log("Raw response:", raw_msg);
        const msg = raw_msg.replace(/^```json\s*|\s*```$/g, ""); // Remove the ```json and ``` wrapping
        // console.log("New response:", msg);

        const applications = JSON.parse(msg);
        applicationsList.applications = applications.applications;
        setApplicationsList(applicationsList);
        // console.log("setApplicationsList: ", applicationsList);

        // Check if the data has the expected structure
        if (applicationsList.applications) {
          setAppChoices(
            applicationsList.applications.map(
              (choice: ApplicationChoice) => choice.name
            )
          ); // Map to an array of strings
          setShowAppChoices(true);
        } else {
          console.error("Unexpected response structure:", applicationsList);
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
        // Fallback: Create a default structure if parsing fails
      }
    } catch (error) {
      console.error("Error fetching application choices:", error);
    }
  };

  const handleFetchSecondPrompt = async () => {
    try {
      // Find the selected application in the applicationsList
      const foundApp = applicationsList.applications.find(
        (app) => app.name === selectedApp
      );

      console.log("Found Application:", foundApp);

      console.log("pins:", Array.from(selectedComponents).join(", \n-"));

      const prompt = `
      Generate a JSON file containing wiring configurations and an Arduino code snippet for an Arduino-based project. The project should include the following components: \n

      \n-${Array.from(selectedComponents).join(", \n-")}\n

      \nThe application of this project is: ${foundApp?.name}. ${foundApp?.description}. 
      \nThe JSON file should follow this format:

      {
        "components": ["List of components used"],
        "wire": [
          {
            "ArduinoBoard": "Pin",
            "Component-1": "Pin"
          },
          {
            "ArduinoBoard": "Pin",
            "Component-2": "Pin"
          }
        ]
      }

      Additionally, provide Arduino code that initializes the components, reads data (if applicable), processes it, and executes necessary actions.
      Use appropriate libraries and ensure the code is structured with comments explaining each section.
      Make sure all pin names are in full capital letters.
      Make sure to use the given component names for the JSON file. Make sure to use the given component name for the wiring connection reference as well.
      Make sure to add 5V and GND connections for all modules with development board. Do not use VCC for the modules, instead use 5V as the pin name.
      Make sure to use D1, D2 etc. for digital pins in the development board.
      Make sure to use A0, A1 etc. for analog pins in the development board.
      `;

      // console.log("Prompt:", prompt);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: API_KEY, // Replace with your actual API key
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        }
      );

      const data = await response.json();

      const raw_msg = data.choices[0].message.content;
      // console.log("response:", raw_msg);

      // Separate JSON and C++ code
      const jsonMatch = raw_msg.match(/```json\s*([\s\S]*?)```/);
      const cppMatch = raw_msg.match(/```cpp\s*([\s\S]*?)```/);

      const jsonString = jsonMatch ? jsonMatch[1].trim() : null;
      const cppString = cppMatch ? cppMatch[1].trim() : null;

      console.log("Extracted JSON:\n", jsonString);
      console.log("Extracted C++ Code:\n", cppString);

      // Save the updated config back to the file
      const fcppString = cppString.split("\n");
      await saveConfig("projects/defaultCode.ino", fcppString);

      await saveConfig("configs/demo.json", JSON.parse(jsonString));

      // Handle the response as needed
    } catch (error) {
      console.error("Error fetching second prompt:", error);
    }
  };

  const CategoryItem = ({
    category,
    depth = 0,
  }: {
    category: ComponentCategory;
    depth?: number;
  }) => {
    const hasContent =
      category.items.length > 0 || (category.children?.length ?? 0) > 0;
    if (!hasContent) return null;

    return (
      <div>
        <button
          className="w-full px-4 py-1 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          style={{ paddingLeft: `${1 + depth}rem` }}
          onClick={() => toggleCategory(category.name)}
        >
          <span className="flex items-center">
            <span className="mr-2">
              {expandedCategories.has(category.name) ? "📂" : "📁"}
            </span>
            {category.name}
          </span>
          <span className="text-xs text-gray-500">
            {category.items.length +
              (category.children?.reduce(
                (acc, child) => acc + child.items.length,
                0
              ) || 0)}
          </span>
        </button>
        {expandedCategories.has(category.name) && (
          <>
            {category.items.length > 0 && (
              <div className="ml-4" style={{ paddingLeft: `${depth}rem` }}>
                {category.items.map((item) => (
                  <div key={item.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={item.name.replace(".json", "")}
                      checked={selectedComponents.has(
                        item.name.replace(".json", "")
                      )}
                      onChange={() => {
                        setSelectedComponents((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.name.replace(".json", ""))) {
                            next.delete(item.name.replace(".json", ""));
                          } else {
                            next.add(item.name.replace(".json", ""));
                          }
                          return next;
                        });
                      }}
                    />
                    <label
                      htmlFor={item.name.replace(".json", "")}
                      className="ml-2"
                    >
                      {item.name.replace(".json", "")}
                    </label>
                  </div>
                ))}
              </div>
            )}
            {category.children?.map((child) => (
              <CategoryItem
                key={child.name}
                category={child}
                depth={depth + 1}
              />
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-semibold">Components</span>
        <span
          className="transform transition-transform duration-200"
          style={{
            transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
          }}
        >
          ▼
        </span>
      </button>
      {isExpanded && (
        <div className="py-2 overflow-y-auto">
          {fetcher.state === "loading" ? (
            <div className="px-4 text-sm text-gray-500">
              Loading components...
            </div>
          ) : categories.length === 0 ? (
            <div className="px-4 text-sm text-gray-500">
              No components found
            </div>
          ) : (
            <>
              {categories.map((category) => (
                <CategoryItem key={category.name} category={category} />
              ))}
              <button
                className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded"
                onClick={handleLogSelectedComponents}
              >
                Log Selected Components
              </button>
              {showAppChoices && (
                <div className="mt-2">
                  <h3 className="font-semibold">Select an Application:</h3>
                  {appChoices.map((app) => (
                    <div key={app} className="flex items-center">
                      <input
                        type="radio"
                        id={app}
                        name="appChoices"
                        value={app}
                        checked={selectedApp === app}
                        onChange={() => setSelectedApp(app)}
                      />
                      <label htmlFor={app} className="ml-2">
                        {app}
                      </label>
                    </div>
                  ))}
                  <button
                    className="mt-2 w-full px-4 py-2 bg-green-500 text-white rounded"
                    onClick={handleFetchSecondPrompt}
                  >
                    Fetch Second Prompt
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
