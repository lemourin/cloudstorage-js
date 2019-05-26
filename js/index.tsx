"use-strict"

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Main } from "./components/Main";

Module.onRuntimeInitialized = async () => {
    ReactDOM.render(
      <Main />,
      document.getElementById("main")
    );
  }
  