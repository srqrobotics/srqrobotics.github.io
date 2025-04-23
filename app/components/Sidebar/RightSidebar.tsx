import React, { useState, useEffect } from "react";
import type { EditorProps } from "@monaco-editor/react";
import { useFile } from "~/contexts/FileContext";
import { useComponents } from "~/contexts/ComponentContext";
import { useRightSidebar } from "~/contexts/RightSidebarContext";
import { FaCode, FaRobot } from "react-icons/fa";
import { API_KEY } from "../../config/config";
import { useCanvasRefresh } from "~/contexts/CanvasRefreshContext";

export default function RightSidebar() {
  const [Editor, setEditor] = useState<React.ComponentType<EditorProps> | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);
  const { selectedFile, setSelectedFile } = useFile();
  const { selectedComponents } = useComponents();
  const [isLoading, setIsLoading] = useState(false);
  const { triggerCanvasRefresh } = useCanvasRefresh();
  const {
    sidebarState: {
      code,
      generatedPrompt,
      activeTab,
      isGenerating,
      selectedApplicationIndex,
    },
    setCode,
    setGeneratedPrompt,
    setActiveTab,
    setIsGenerating,
    setSelectedApplicationIndex,
  } = useRightSidebar();

  useEffect(() => {
    setIsMounted(true);
    import("@monaco-editor/react").then((module) => {
      setEditor(() => module.default);
    });
  }, []);

  async function loadFileContent() {
    setIsLoading(true);
    try {
      if (selectedFile) {
        const response = await fetch(
          `/api/file-content?path=${encodeURIComponent(selectedFile)}`
        );
        const data = await response.json();
        if (data.content !== undefined) {
          setCode(data.content);
        }
      } else {
        const response = await fetch("/projects/defaultCode.ino");
        const text = await response.text();
        let modText = text.replace(/^\[|\]$/g, "");
        const lines = modText.split("\n");
        const modifiedLines = lines
          .map((line) => line.slice(3, -2))
          .map((line) => line.replace(/\\"/g, '"'));
        modifiedLines.push("}");
        const mergedLines = modifiedLines.join("\n");
        setCode(mergedLines);
      }
    } catch (error) {
      console.error("Error loading file:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFileContent();
  }, [selectedFile]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  const getFileName = () => {
    if (!selectedFile) return "defaultCode.ino";
    const parts = selectedFile.split("/");
    return parts[parts.length - 1];
  };

  const getFilePath = () => {
    if (!selectedFile) return "";
    const projectsIndex = selectedFile.indexOf("/projects/");
    if (projectsIndex === -1) return "";
    const relativePath = selectedFile.slice(projectsIndex + 15);
    const parts = relativePath.split("/");
    return parts.slice(0, -1).join("/");
  };

  const handleGeneratePrompt = async () => {
    if (selectedComponents.length === 0) {
      setGeneratedPrompt({
        error: "Please select at least one component from the left sidebar.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const applicationsPrompt = `
      Based on the following electronic components:
      
      \t- ${selectedComponents.join(", \n\t\t- ")}
      
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

      const responseText = await response.text();
      const responseJSON = JSON.parse(responseText);

      try {
        const raw_msg = responseJSON.choices[0].message.content;
        const msg = raw_msg.replace(/^```json\s*|\s*```$/g, ""); // Remove the ```json and ``` wrapping
        const applications = JSON.parse(msg);
        setGeneratedPrompt(applications);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        setGeneratedPrompt({
          error: "Error parsing the response. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error generating prompt:", error);
      setGeneratedPrompt({
        error: "Error generating prompt. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplicationSelect = (index: number) => {
    setSelectedApplicationIndex(
      selectedApplicationIndex === index ? null : index
    );
  };

  const handleApplyPrompt = () => {
    if (generatedPrompt && !generatedPrompt.error) {
      if (selectedApplicationIndex !== null && generatedPrompt.applications) {
        const selectedApp =
          generatedPrompt.applications[selectedApplicationIndex];
        const formattedJson = JSON.stringify(
          {
            selectedApplication: selectedApp,
            components: selectedComponents,
          },
          null,
          2
        );
        setCode(formattedJson);
        setActiveTab("code");
      } else {
        setCode(JSON.stringify(generatedPrompt, null, 2));
      }
    }
  };

  const handleGenerateWiringAndCode = async () => {
    if (selectedComponents.length === 0) {
      setGeneratedPrompt({
        error: "Please select at least one component from the left sidebar.",
      });
      return;
    }

    if (selectedApplicationIndex === null || !generatedPrompt?.applications) {
      setGeneratedPrompt({
        error: "Please select an application from the list.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const selectedApp =
        generatedPrompt.applications[selectedApplicationIndex];

      // Load component data to get pin information
      const componentDataPromises = selectedComponents.map(
        async (componentId) => {
          try {
            // Try to load from devBible.json first
            const devBibleResponse = await fetch("/packages/devBible.json");
            if (devBibleResponse.ok) {
              const devBibleData = await devBibleResponse.json();
              const component = devBibleData.components?.find(
                (c: any) => c.id === componentId
              );
              if (component && component["pin-map"]?.src) {
                const pinMapResponse = await fetch(component["pin-map"].src);
                const pinMapData = await pinMapResponse.json();
                return {
                  id: componentId,
                  name: component.name,
                  pins: pinMapData["digital-pins"]?.id || [],
                };
              }
            }

            // If not found, try sensorBible.json
            const sensorBibleResponse = await fetch(
              "/packages/sensorBible.json"
            );
            if (sensorBibleResponse.ok) {
              const sensorBibleData = await sensorBibleResponse.json();
              const component = sensorBibleData.components?.find(
                (c: any) => c.id === componentId
              );
              if (component && component["pin-map"]?.src) {
                const pinMapResponse = await fetch(component["pin-map"].src);
                const pinMapData = await pinMapResponse.json();
                return {
                  id: componentId,
                  name: component.name,
                  pins: pinMapData["digital-pins"]?.id || [],
                };
              }
            }

            return {
              id: componentId,
              name: componentId,
              pins: [],
            };
          } catch (error) {
            console.error(
              `Error loading component data for ${componentId}:`,
              error
            );
            return {
              id: componentId,
              name: componentId,
              pins: [],
            };
          }
        }
      );

      const componentsWithPins = await Promise.all(componentDataPromises);

      // Format component information with pins
      const componentsInfo = componentsWithPins
        .map(
          (comp) =>
            `- ${comp.name} (${comp.id}): Available pins: ${comp.pins.join(", ")}`
        )
        .join("\n");

      const prompt = `
      Generate a JSON file containing wiring configurations and an Arduino code snippet for an Arduino-based project. The project should include the following components: \n

      ${componentsInfo}

      \nThe application of this project is: ${selectedApp.name}. ${selectedApp.description}. 
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
      Make sure to use just the Available pins names given infront of the respective component names for the wiring json.
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

      if (jsonString && cppString) {
        // Save the JSON configuration
        await fetch("/api/save-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file: "configs/demo.json",
            content: JSON.parse(jsonString),
          }),
        });

        // Save the Arduino code
        await fetch("/api/save-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file: "projects/defaultCode.ino",
            content: cppString.split("\n"),
          }),
        });

        // Set the code in the editor
        setCode(cppString);
        setActiveTab("code");

        // Trigger canvas refresh to update the wiring
        triggerCanvasRefresh();
      } else {
        setGeneratedPrompt({
          error: "Failed to generate wiring and code. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error generating wiring and code:", error);
      setGeneratedPrompt({
        error: "Error generating wiring and code. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderGeneratedPrompt = () => {
    if (!generatedPrompt) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
          {isGenerating ? (
            <div>Generating prompt...</div>
          ) : (
            <div>
              No prompt generated yet. Select components and click "Generate
              Ideas".
            </div>
          )}
        </div>
      );
    }

    if (generatedPrompt.error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded">
          <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">
            Error:
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            {generatedPrompt.error}
          </p>
        </div>
      );
    }

    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
          Suggested Applications:
        </h3>
        <div className="space-y-4">
          {generatedPrompt.applications?.map((app: any, index: number) => (
            <div
              key={index}
              className={`bg-white dark:bg-gray-700 p-4 rounded shadow-sm cursor-pointer transition-all duration-200 ${
                selectedApplicationIndex === index
                  ? "ring-2 ring-green-500 dark:ring-green-400"
                  : "hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800"
              }`}
              onClick={() => handleApplicationSelect(index)}
            >
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                {app.name}
              </h4>
              {selectedApplicationIndex === index && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {app.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          className={`flex-1 py-2 flex items-center justify-center ${
            activeTab === "prompt"
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          onClick={() => setActiveTab("prompt")}
        >
          <FaRobot className="mr-2" />
          <span>Idea Lab</span>
        </button>

        <button
          className={`flex-1 py-2 flex items-center justify-center ${
            activeTab === "code"
              ? "bg-gray-200 dark:bg-gray-700"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          onClick={() => setActiveTab("code")}
        >
          <FaCode className="mr-2" />
          <span>Code Editor</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "code" ? (
        <>
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Code Editor
            </h2>
            {isLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <div className="text-sm flex items-center mt-0.5 min-h-[1.25rem]">
                <span className="text-gray-500 dark:text-gray-400 truncate">
                  {getFilePath()}
                </span>
                {getFilePath() && (
                  <span className="mx-1 text-gray-500 dark:text-gray-400">
                    /
                  </span>
                )}
                <span className="text-gray-700 dark:text-gray-300 truncate font-medium">
                  {getFileName()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 relative">
            {isMounted && Editor ? (
              <div className="absolute inset-0">
                <Editor
                  height="100%"
                  defaultLanguage="cpp"
                  theme="vs-dark"
                  value={code}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            ) : (
              <div className="p-4 font-mono text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                {code}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Idea Lab
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select components from the left sidebar, then generate project
              ideas.
            </p>
            <div className="flex space-x-2">
              <button
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGeneratePrompt}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate Ideas"}
              </button>
              <button
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGenerateWiringAndCode}
                disabled={
                  !generatedPrompt ||
                  !!generatedPrompt.error ||
                  selectedApplicationIndex === null ||
                  isGenerating
                }
              >
                {isGenerating ? "Generating..." : "Generate Wiring & Code"}
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {renderGeneratedPrompt()}
          </div>
        </div>
      )}
    </div>
  );
}
