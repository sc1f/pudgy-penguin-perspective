/* eslint-disable @typescript-eslint/no-namespace */

import * as React from "react";
import * as ReactDOM from "react-dom";
import {useEffect, useRef} from "react";
import perspective, {Table} from "@finos/perspective";

import "@finos/perspective-viewer";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer-d3fc";
import "@finos/perspective-workspace";

import "./index.css";
import "@finos/perspective-workspace/dist/umd/material.css";

// import {PerspectiveViewerElement, PerspectiveViewerConfig} from "@finos/perspective-viewer";

declare global {
    namespace JSX {
        interface IntrinsicElements {
            "perspective-workspace": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

const worker = perspective.shared_worker();

const getTable = async (): Promise<Table> => {
    const req = fetch("./data.arrow");
    const resp = await req;
    const buffer = await resp.arrayBuffer();
    return await worker.table(buffer as any);
};

const workspace_config: any = {
    detail: {
        main: {
            currentIndex: 0,
            type: "tab-area",
            widgets: [{table: "asset_events"}]
        }
    }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Workspace = (): React.ReactElement => {
    const workspace = useRef<any>(null);

    useEffect(() => {
        if (workspace.current) {
            console.log(workspace.current);
            workspace.current.addTable("asset_events", getTable());
            workspace.current.restore(workspace_config);
        }
    });

    return <perspective-workspace ref={workspace}></perspective-workspace>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const App = (): React.ReactElement => {
    return (
        <div id="main" className="container">
            <Workspace />
        </div>
    );
};

window.addEventListener("load", () => {
    ReactDOM.render(<App />, document.getElementById("root"));
});
