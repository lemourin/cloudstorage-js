import * as React from "react";

import { CloudFactory } from "../cloudstorage"

export interface MainState { content: string, authorizeUrl: string, providers: string }

export class Main extends React.Component<{}, MainState> {
    constructor(props: {}) {
        super(props);
        this.state = { content: "", authorizeUrl: "", providers: "" };
    }

    async componentDidMount() {
        const factory = new CloudFactory();

        this.setState({
            providers: factory.availableProviders().toString(),
            authorizeUrl: factory.authorizeUrl("google")
        });

        const access = factory.createAccess(process.env.CLOUD_TYPE, process.env.CLOUD_TOKEN);
        const page = await access.listDirectoryPage(access.root(), "");

        this.setState({ content: page.items.reduce((accumulator, current) => accumulator + "\n" + current.filename(), "") });

        page.destroy();
        access.destroy();
        factory.destroy();
    }

    render() {
        return <div>
            <p>Google auth url: {this.state.authorizeUrl}</p>
            <p>Content: {this.state.content}</p>
            <p>Providers: {this.state.providers}</p>
        </div>;
    }
}