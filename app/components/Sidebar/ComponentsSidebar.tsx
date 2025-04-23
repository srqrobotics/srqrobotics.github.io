import React, { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import type { FileSystemItem } from "~/types/files";
import ComponentItem from "./ComponentItem";
import { API_KEY } from "../../config/config"; // Adjust the path as necessary
import { useComponents } from "~/contexts/ComponentContext";

interface ComponentItemType {
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
  items: ComponentItemType[];
  children?: ComponentCategory[];
}

interface ApplicationChoice {
  id: number;
  name: string;
  description: string;
}

export default function ComponentsSidebar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("Basic");
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const { selectedComponents, addSelectedComponent, removeSelectedComponent } =
    useComponents();
  const [isLoading, setIsLoading] = useState(true);
  const [appChoices, setAppChoices] = useState<string[]>([]);
  const [showAppChoices, setShowAppChoices] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [applicationsList, setApplicationsList] = useState<{
    applications: ApplicationChoice[];
  }>({ applications: [] });
  const fetcher = useFetcher();

  useEffect(() => {
    fetcher.load("/api/packages");
  }, []);

  useEffect(() => {
    if (fetcher.data?.packages) {
      console.log("Fetched packages:", fetcher.data.packages);
      processPackages(fetcher.data.packages).then((processed) => {
        console.log("Processed categories:", processed);
        // Log the first few components to check their data
        if (processed.length > 0) {
          console.log(
            "Sample components:",
            processed
              .flatMap((cat) => cat.items)
              .slice(0, 5)
              .map((item) => ({
                id: item.id,
                name: item.name,
                icon: item.icon,
                image: item.image,
              }))
          );
        }
        setCategories(processed);
        setIsLoading(false);
      });
    } else if (fetcher.state === "idle" && !fetcher.data) {
      // If API call fails, set empty categories
      setCategories([]);
      setIsLoading(false);
    }
  }, [fetcher.data, fetcher.state]);

  // Load component data from parent JSON files
  const loadComponentData = async (componentId: string): Promise<any> => {
    try {
      // Try to load from devBible.json first
      const devBibleResponse = await fetch("/packages/devBible.json");
      if (devBibleResponse.ok) {
        const devBibleData = await devBibleResponse.json();
        const component = devBibleData.components?.find(
          (c: any) => c.id === componentId
        );
        if (component) {
          return component;
        }
      }

      // If not found, try sensorBible.json
      const sensorBibleResponse = await fetch("/packages/sensorBible.json");
      if (sensorBibleResponse.ok) {
        const sensorBibleData = await sensorBibleResponse.json();
        const component = sensorBibleData.components?.find(
          (c: any) => c.id === componentId
        );
        if (component) {
          return component;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error loading component data for ${componentId}:`, error);
      return null;
    }
  };

  const processPackages = async (
    packages: FileSystemItem[]
  ): Promise<ComponentCategory[]> => {
    console.log("Processing packages:", packages);

    const processDirectory = async (
      dir: FileSystemItem
    ): Promise<ComponentCategory> => {
      const items: ComponentItemType[] = [];
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

            // Get component ID from the filename
            const componentId = item.name.replace(".json", "");

            // Load component data from parent JSON files
            const parentData = await loadComponentData(componentId);
            console.log("Parent component data:", parentData);

            // Get the icon path from parent data or fallback to local data
            let iconPath = "";
            if (parentData?.image?.src) {
              iconPath = parentData.image.src;
            } else if (data.icon) {
              iconPath = data.icon;
            } else if (data.image?.src) {
              iconPath = data.image.src;
            }

            console.log("Component icon path:", iconPath);

            // If the icon path is relative, make it absolute
            if (
              iconPath &&
              !iconPath.startsWith("http") &&
              !iconPath.startsWith("/")
            ) {
              iconPath = `/${iconPath}`;
            }

            // Check if the image exists
            if (iconPath) {
              try {
                const imgResponse = await fetch(iconPath, { method: "HEAD" });
                if (!imgResponse.ok) {
                  console.warn(`Image not found: ${iconPath}`);
                  iconPath = ""; // Reset to empty if image doesn't exist
                }
              } catch (error) {
                console.warn(`Error checking image: ${iconPath}`, error);
                iconPath = ""; // Reset to empty if there's an error
              }
            }

            const componentItem: ComponentItemType = {
              id: componentId,
              name: data.name || componentId,
              path: item.path,
              icon: iconPath,
              image: parentData?.image || data.image,
            };
            console.log("Created component item:", componentItem);
            items.push(componentItem);
          } catch (error) {
            console.error(
              `Error loading component data for ${item.path}:`,
              error
            );
            // Add a fallback component if loading fails
            items.push({
              id: item.name.replace(".json", ""),
              name: item.name.replace(".json", ""),
              path: item.path,
              icon: "",
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

  const handleDragStart = (
    e: React.DragEvent,
    component: ComponentItemType
  ) => {
    e.dataTransfer.setData("component", JSON.stringify(component));
  };

  const toggleComponentSelection = (componentId: string) => {
    if (selectedComponents.includes(componentId)) {
      removeSelectedComponent(componentId);
    } else {
      addSelectedComponent(componentId);
    }
  };

  // Flatten categories for search
  const getAllComponents = (cats: ComponentCategory[]): ComponentItemType[] => {
    return cats.reduce((acc, cat) => {
      return [
        ...acc,
        ...cat.items,
        ...(cat.children ? getAllComponents(cat.children) : []),
      ];
    }, [] as ComponentItemType[]);
  };

  const allComponents = getAllComponents(categories);
  const filteredComponents = allComponents.filter((component) =>
    component.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveConfig = async (
    filePath: string,
    content: string
  ): Promise<void> => {
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

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: API_KEY,
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
      const responseText = await response.text();
      const responseJSON = JSON.parse(responseText);

      try {
        const raw_msg = responseJSON.choices[0].message.content;
        const msg = raw_msg.replace(/^```json\s*|\s*```$/g, ""); // Remove the ```json and ``` wrapping

        const applications = JSON.parse(msg);
        applicationsList.applications = applications.applications;
        setApplicationsList(applicationsList);

        // Check if the data has the expected structure
        if (applicationsList.applications) {
          setAppChoices(
            applicationsList.applications.map(
              (choice: ApplicationChoice) => choice.name
            )
          );
          setShowAppChoices(true);
        } else {
          console.error("Unexpected response structure:", applicationsList);
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
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

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: API_KEY,
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

  // Function to get the appropriate icon for a category
  const getCategoryIcon = (categoryName: string) => {
    const categoryLower = categoryName.toLowerCase();

    if (
      categoryLower.includes("microcontroller") ||
      categoryLower.includes("arduino") ||
      categoryLower.includes("esp")
    ) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      );
    } else if (
      categoryLower.includes("sensor") ||
      categoryLower.includes("module")
    ) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20M2 12h20"></path>
          <circle cx="12" cy="12" r="4"></circle>
        </svg>
      );
    } else if (
      categoryLower.includes("power") ||
      categoryLower.includes("battery")
    ) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
        </svg>
      );
    } else if (
      categoryLower.includes("basic") ||
      categoryLower.includes("component")
    ) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
        </svg>
      );
    } else {
      // Default icon for other categories
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>
      );
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
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium border-b border-gray-200 dark:border-gray-700"
          style={{ paddingLeft: `${1 + depth}rem` }}
          onClick={() => toggleCategory(category.name)}
        >
          <span className="flex items-center">
            <span className="mr-2 text-gray-500 dark:text-gray-400">
              {getCategoryIcon(category.name)}
            </span>
            {category.name}
          </span>
          <span className="flex items-center">
            <span className="text-xs text-gray-500 mr-2">
              {category.items.length +
                (category.children?.reduce(
                  (acc, child) => acc + child.items.length,
                  0
                ) || 0)}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transform transition-transform duration-200 ${
                expandedCategories.has(category.name) ? "rotate-180" : ""
              }`}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </button>
        {expandedCategories.has(category.name) && (
          <>
            {category.items.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 py-2">
                <div className="grid grid-cols-2 gap-2 px-2">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className={`cursor-pointer ${selectedComponents.includes(item.id) ? "ring-2 ring-green-500" : ""}`}
                      onClick={() => toggleComponentSelection(item.id)}
                    >
                      <ComponentItem
                        name={item.name}
                        icon={item.icon}
                        onDragStart={(e) => handleDragStart(e, item)}
                      />
                    </div>
                  ))}
                </div>
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
    <div className="flex flex-col h-full w-full">
      {/* Search Bar */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Search components..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Category Selection */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <select
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat.name} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Components List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-gray-500 dark:text-gray-400">
              Loading components...
            </div>
          </div>
        ) : (
          <div>
            {searchTerm ? (
              // When searching, show all filtered components
              <div className="grid grid-cols-2 gap-2 p-2">
                {filteredComponents.map((component) => (
                  <div
                    key={component.id}
                    className={`cursor-pointer ${selectedComponents.includes(component.id) ? "ring-2 ring-green-500" : ""}`}
                    onClick={() => toggleComponentSelection(component.id)}
                  >
                    <ComponentItem
                      name={component.name}
                      icon={component.icon}
                      onDragStart={(e) => handleDragStart(e, component)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              // When not searching, show categories with their components
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((cat) => (
                  <CategoryItem key={cat.name} category={cat} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
