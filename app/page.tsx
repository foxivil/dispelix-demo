import Stage from "./components/Stage";
import { ThemeProvider } from "./theme/ThemeProvider";

export default function Page() {
  return (
    <ThemeProvider>
      <Stage />
    </ThemeProvider>
  );
}
