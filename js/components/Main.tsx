import * as React from "react";

import { CloudFactory } from "../cloudstorage";

import { AppBar } from "react-toolbox/lib/app_bar";
import { Layout, NavDrawer, Panel } from "react-toolbox/lib/layout";
import { List, ListItem } from "react-toolbox/lib/list";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { AddAccount } from "./AddAccount";

function TestingContent() {
    return <div style={{ flex: 1, overflowY: 'auto', padding: '1.8rem' }}>
        <p>Google auth url: {this.state.authorizeUrl}</p>
        <p>Content: {this.state.content}</p>
        <p>Providers: {this.state.providers}</p>
    </div>
}

interface MainState {
    factory: CloudFactory,
    content: string,
    authorizeUrl: string,
    providers: string,
    drawerActive: boolean
};

export class Main extends React.Component<{}, MainState> {
    state = {
        factory: new CloudFactory(),
        content: "",
        authorizeUrl: "",
        providers: "",
        drawerActive: false
    }

    toggleDrawerActive = () => {
        this.setState({ drawerActive: !this.state.drawerActive })
    }

    async componentDidMount() {
        const factory = this.state.factory;
        this.setState({
            providers: factory.availableProviders().toString(),
            authorizeUrl: factory.authorizeUrl("google")
        });

        const access = factory.createAccess(process.env.CLOUD_TYPE, process.env.CLOUD_TOKEN);
        const page = await access.listDirectoryPage(access.root(), "");

        this.setState({ content: page.items.reduce((accumulator, current) => accumulator + "\n" + current.filename(), "") });

        page.destroy();
        access.destroy();
    }

    render() {
        return <Router>
            <Layout>
                <NavDrawer active={this.state.drawerActive} onOverlayClick={this.toggleDrawerActive}>
                    <List>
                        <Link to="/add_account/">
                            <ListItem caption="Add account" />
                        </Link>
                        <Link to="/">
                            <ListItem caption="Main page" />
                        </Link>
                    </List>
                </NavDrawer>
                <Panel>
                    <AppBar leftIcon="menu" onLeftIconClick={this.toggleDrawerActive} />
                    <Route path="/" exact component={TestingContent.bind(this)} />
                    <Route path="/add_account/" exact component={() => { return <AddAccount factory={this.state.factory} />; }} />
                </Panel>
            </Layout>
        </Router>;
    }
}