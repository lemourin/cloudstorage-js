import * as React from "react";

interface AuthorizedViewProps {
    accountType: string
    search: string
};

export default class AuthorizedView extends React.Component<AuthorizedViewProps, {}> {
    render() {
        return <div>
            <div>Account type: {this.props.accountType}</div>
            <div>Token: {this.props.search}</div>
        </div>
    }
};