import * as React from "react";

import { CloudFactory } from "../cloudstorage";

import { AppBar } from "react-toolbox/lib/app_bar";
import { Layout, NavDrawer, Panel } from "react-toolbox/lib/layout";
import { List, ListItem } from "react-toolbox/lib/list";
import { Route, Link } from "react-router-dom";
import { AddAccount } from "./AddAccount";
import AuthorizedView from "./AuthorizedView";

export interface CloudAccount {
    type: string,
    label: string,
    token: string,
    accessToken: string
}

interface LocationState {
    accounts: CloudAccount[]
}

interface LocationProps {
    state: LocationState
}

interface MainProps {
    location: LocationProps
}

interface MainState {
    factory: CloudFactory,
    drawerActive: boolean,
    authorizationCode: string,
    authorizationAccountType: string,
    accounts: CloudAccount[]
};

export class Main extends React.Component<MainProps, MainState> {
    state = {
        factory: new CloudFactory(process.env.HOSTNAME!),
        drawerActive: false,
        authorizationCode: "",
        authorizationAccountType: "",
        accounts: JSON.parse(localStorage.getItem("accounts") || "[]")
    }

    constructor(props: MainProps) {
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

    componentDidUpdate() {
        if (this.props.location && this.props.location.state && this.props.location.state.accounts &&
            this.props.location.state.accounts != this.state.accounts) {
            this.setState({ accounts: this.props.location.state.accounts });
        }
    }

    render() {
        return <Layout>
            <NavDrawer active={this.state.drawerActive} onOverlayClick={this.toggleDrawerActive}>
                <List>
                    {
                        this.state.accounts.map((account: CloudAccount) => {
                            const key = `${account.type}: ${account.label}`;
                            return <ListItem key={key} caption={key} />;
                        })
                    }
                    <Link to="/add_account/">
                        <ListItem caption="Add account" onClick={this.toggleDrawerActive} />
                    </Link>
                    <Link to="/">
                        <ListItem caption="Main page" onClick={this.toggleDrawerActive} />
                    </Link>
                </List>
            </NavDrawer>
            <Panel>
                <AppBar leftIcon="menu" onLeftIconClick={this.toggleDrawerActive} />
                <Route path="/add_account/" exact component={() => { return <AddAccount factory={this.state.factory} />; }} />
                <Route path="/authorized/:accountType/:code(.*)" component={
                    (props: any) => {
                        return <AuthorizedView
                            factory={this.state.factory}
                            accountType={props.match.params.accountType}
                            authorizationCode={decodeURIComponent(props.match.params.code)} />
                    }
                } />
            </Panel>
        </Layout>;
    }
}