/* eslint-disable @typescript-eslint/no-namespace */

import * as React from "react";
import * as ReactDOM from "react-dom";
import {useEffect, useRef} from "react";
import perspective, {Table} from "@finos/perspective";
import chroma from "chroma-js";

import "@finos/perspective-workspace";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer-d3fc";

import "./index.css";
import "@finos/perspective-workspace/dist/umd/material.dark.css";

import default_config from "./config.json";

import "./custom_heatmap";
import "./custom_datagrid";

window.chroma = chroma;

// Required because perspective-workspace doesn't export type declarations
declare global {
    namespace JSX {
        interface IntrinsicElements {
            "perspective-workspace": React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement>,
                HTMLElement
            >;
        }
    }
}

const worker = perspective.shared_worker();

const getTable = async (): Promise<Table> => {
    const req = fetch("./cleaned.arrow");
    const resp = await req;
    const buffer = await resp.arrayBuffer();
    return await worker.table(buffer as any);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Workspace = (): React.ReactElement => {
    const workspace = useRef<any>(null);

    useEffect(() => {
        if (workspace.current) {
            // Restore a saved config or default
            let config = window.localStorage.getItem(
                "pudgy_penguins_perspective_workspace_config"
            );

            const layout = config ? JSON.parse(config) : default_config;

            (async function () {
                await workspace.current.restore(layout);
                await workspace.current.flush();
            })();

            workspace.current.addTable("asset_events", getTable());
            const progress = document.getElementById("progress");
            progress?.setAttribute("style", "display:none;");

            workspace.current.addEventListener(
                "workspace-layout-update",
                async () => {
                    const config = await workspace.current.save();
                    console.debug("Saving to localStorage:", config);
                    window.localStorage.setItem(
                        "pudgy_penguins_perspective_workspace_config",
                        JSON.stringify(config)
                    );
                }
            );
        }
    });

    return <perspective-workspace ref={workspace}></perspective-workspace>;
};

const Footer = (): React.ReactElement => {
    const resetLayout = () => {
        const workspace: any = document.getElementsByTagName(
            "perspective-workspace"
        )[0];
        workspace.restore(default_config);
    };

    return (
        <div className="footer">
            <div className="footer-meta">
                <a
                    href="https://github.com/sc1f/pudgy-penguin-perspective"
                    target="blank"
                    id="github-link"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                </a>
                <p>
                    Built with{" "}
                    <a
                        href="https://github.com/finos/perspective"
                        target="blank"
                    >
                        Perspective
                    </a>
                </p>
                <p>
                    Data from{" "}
                    <a
                        href="https://docs.opensea.io/reference/api-overview"
                        target="blank"
                    >
                        OpenSea
                    </a>{" "}
                </p>
            </div>
            <button id="reset_config" onClick={resetLayout}>
                Reset to Default Layout
            </button>
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const App = (): React.ReactElement => {
    return (
        <div id="main" className="container">
            <Workspace />
            <Footer />
        </div>
    );
};

window.addEventListener("load", () => {
    ReactDOM.render(<App />, document.getElementById("root"));
});
