import * as React from "react";

import { CloudFactory } from "../cloudstorage";

import { AppBar } from "react-toolbox/lib/app_bar";
import { Layout, NavDrawer, Panel } from "react-toolbox/lib/layout";
import { List, ListItem } from "react-toolbox/lib/list";
import { HashRouter as Router, Route, Link } from "react-router-dom";
import { AddAccount } from "./AddAccount";
import AuthorizedView from "./AuthorizedView";

function TestingContent() {
    return <div style={{ flex: 1, overflowY: 'auto', padding: '1.8rem' }}>
        <p>Google auth url</p>
    </div>
}

interface MainState {
    factory: CloudFactory,
    drawerActive: boolean,
    authorizationCode: string,
    authorizationAccountType: string
};

export class Main extends React.Component<{}, MainState> {
    state = {
        factory: new CloudFactory(process.env.HOSTNAME),
        drawerActive: false,
        authorizationCode: "",
        authorizationAccountType: ""
    }

    constructor(props: {}) {
        super(props);
    }

    toggleDrawerActive = () => {
        this.setState({ drawerActive: !this.state.drawerActive })
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
                    {
                        this.state.factory.availableProviders().map((value, _) => {
                            return <Route
                                key={value}
                                path={`/${value}/:code(.*)`}
                                component={(props: any) => {
                                    return <AuthorizedView accountType={value} authorizationCode={props.match.params.code} />
                                }}
                            />;
                        })
                    }
                </Panel>
            </Layout>
        </Router>;
    }
}