import { createRoot } from "react-dom/client";
import { DemoExperience } from "../../src/components/showcase/DemoExperience";
createRoot(document.getElementById("demo")!).render(
  <DemoExperience videoSrc="./demo-tour.webm" />,
);
