import * as React from "react";

interface AuthorizeViewProps {
    accountType: string
};

export default class AuthorizeView extends React.Component<AuthorizeViewProps, {}> {
    render() {
        return <div>
            {this.props.accountType}
        </div>
    }
};