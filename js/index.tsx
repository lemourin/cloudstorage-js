"use-strict"

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Main } from "./components/Main";
import { HashRouter as Router, Route } from "react-router-dom";

Module.onRuntimeInitialized = async () => {
  ReactDOM.render(
    <Router>
      <Route path="/" component={Main} />
    </Router>,
    document.getElementById("main")
  );
}
