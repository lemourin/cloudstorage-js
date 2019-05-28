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
        this.state.factory.loadConfig({
            keys: {
                google: {
                    client_id: "291075523655-bjt77t9cbqkdsvfudovb5h1k8i3ak66i.apps.googleusercontent.com",
                    client_secret: "BdNvLHCAyiAPge_WHJ_oA5Sr"
                },
                gphotos: {
                    client_id: "291075523655-bjt77t9cbqkdsvfudovb5h1k8i3ak66i.apps.googleusercontent.com",
                    client_secret: "BdNvLHCAyiAPge_WHJ_oA5Sr"
                },
                youtube: {
                    client_id: "291075523655-bjt77t9cbqkdsvfudovb5h1k8i3ak66i.apps.googleusercontent.com",
                    client_secret: "BdNvLHCAyiAPge_WHJ_oA5Sr"
                }
            }
        });
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
                    <Route path="/authorized/:accountType/:code(.*)" component={
                        (props: any) => {
                            return <AuthorizedView
                                accountType={props.match.params.accountType}
                                authorizationCode={decodeURIComponent(props.match.params.code)} />
                        }
                    } />
                </Panel>
            </Layout>
        </Router>;
    }
}